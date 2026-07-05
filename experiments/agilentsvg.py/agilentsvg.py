"""Export Agilent acquisition chromatograms to annotated SVG.

Install deps:
    python -m pip install chromstream matplotlib numpy rainbow-api
"""
from __future__ import annotations

import argparse
from pathlib import Path

import chromstream as cs
import matplotlib.pyplot as plt
import numpy as np
import rainbow as rb


def _is_spectral_library(path: Path) -> bool:
    """MassHunter/NIST .L libraries store spectra in FULL.D, not TIC traces."""
    if path.is_file() and path.name.upper() == "FULL.D":
        parent = path.parent
        return parent.suffix.upper() == ".L" or (parent / "INDEX").is_file()
    if path.is_dir():
        return (path / "FULL.D").is_file() and (path / "INDEX").is_file()
    return False


def _spectral_library_error(path: Path) -> ValueError:
    return ValueError(
        f"{path} is a MassHunter/NIST spectral library entry, not an "
        "acquisition chromatogram folder. Pass --input a ChemStation or "
        "MassHunter *.D acquisition directory (with .ch files or AcqData/)."
    )


def _load_chemstation(path: Path) -> tuple[np.ndarray, np.ndarray, str]:
    exp = cs.Experiment(name=path.name)
    exp.add_mult_chromatograms(path)
    if not exp.channels:
        raise ValueError(f"No chromatograms found in {path}")

    channel = next(iter(exp.channels.values()))
    if not channel.chromatograms:
        raise ValueError(f"No .ch traces found in {path}")

    chrom = channel.chromatograms[0]
    x_col, y_col = chrom.data.columns[0], chrom.data.columns[1]
    time_minutes = chrom.data[x_col].to_numpy(dtype=float)
    abundance = chrom.data[y_col].to_numpy(dtype=float)
    return time_minutes, abundance, str(chrom.channel)


def _load_single_ch(path: Path) -> tuple[np.ndarray, np.ndarray, str]:
    exp = cs.Experiment(name=path.stem)
    exp.add_chromatogram(path)
    channel = next(iter(exp.channels.values()))
    chrom = channel.chromatograms[0]
    x_col, y_col = chrom.data.columns[0], chrom.data.columns[1]
    return (
        chrom.data[x_col].to_numpy(dtype=float),
        chrom.data[y_col].to_numpy(dtype=float),
        str(chrom.channel),
    )


def _load_masshunter(path: Path) -> tuple[np.ndarray, np.ndarray, str]:
    datadir = rb.read(str(path), hrms=True, centroid=True)
    ms_files = [f for f in datadir.files if f.detector == "MS"]
    if not ms_files:
        raise ValueError(f"No MS data found in MassHunter folder {path}")

    ms = ms_files[0]
    time_minutes = ms.xlabels.astype(float)
    abundance = ms.data.sum(axis=1).astype(float)
    return time_minutes, abundance, "TIC"


def load_agilent_chromatogram(
    agilent_path: str | Path,
) -> tuple[np.ndarray, np.ndarray, str]:
    path = Path(agilent_path)
    if not path.exists():
        raise FileNotFoundError(f"Path not found: {path}")

    if _is_spectral_library(path):
        raise _spectral_library_error(path)

    if path.is_file() and path.suffix.lower() == ".ch":
        return _load_single_ch(path)

    if path.is_dir():
        if (path / "AcqData").is_dir():
            return _load_masshunter(path)
        if path.name.lower().endswith(".d"):
            return _load_chemstation(path)
        raise ValueError(
            f"Unrecognized Agilent folder: {path}. Expected a *.D directory "
            "with .ch files (ChemStation) or AcqData/ (MassHunter)."
        )

    raise ValueError(
        f"Expected a *.D directory or *.ch file, got: {path}"
    )


def find_peak_labels(
    time_minutes: np.ndarray,
    abundance: np.ndarray,
    baseline_threshold: float | None = None,
) -> list[tuple[float, float]]:
    if baseline_threshold is None:
        baseline_threshold = max(float(abundance.max()) * 0.05, 1.0)

    peak_labels: list[tuple[float, float]] = []
    for i in range(1, len(abundance) - 1):
        if abundance[i] > abundance[i - 1] and abundance[i] > abundance[i + 1]:
            if abundance[i] > baseline_threshold:
                peak_labels.append((float(time_minutes[i]), float(abundance[i])))
    return peak_labels


def render_chromatogram_figure(
    time_minutes: np.ndarray,
    abundance: np.ndarray,
    title_name: str,
    peak_labels: list[tuple[float, float]] | None = None,
    baseline_threshold: float | None = None,
):
    """Build a matplotlib figure for preview or export."""
    if peak_labels is None:
        peak_labels = find_peak_labels(time_minutes, abundance, baseline_threshold)

    fig, ax = plt.subplots(figsize=(10, 4.5), dpi=300)
    ax.plot(time_minutes, abundance, color="#1A1A1A", linewidth=1.2, label="Trace")

    for rt, intensity in peak_labels:
        ax.vlines(
            x=rt,
            ymin=intensity,
            ymax=intensity + (intensity * 0.05),
            colors="blue",
            linestyles="solid",
            linewidth=0.6,
        )
        ax.text(
            rt,
            intensity + (intensity * 0.06),
            f"{rt:.3f}",
            color="blue",
            fontsize=8,
            ha="center",
            va="bottom",
        )

    ax.set_title(
        f"Total Ion Chromatogram — {title_name}",
        fontsize=11,
        fontweight="bold",
        pad=15,
    )
    ax.set_xlabel("Time (minutes)", fontsize=10, labelpad=8)
    ax.set_ylabel("Abundance (Intensity Units)", fontsize=10, labelpad=8)
    ax.grid(True, linestyle="--", alpha=0.3, color="#CCCCCC")
    ax.set_xlim(float(time_minutes.min()), float(time_minutes.max()))
    ax.set_ylim(0, float(abundance.max()) * 1.15)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    plt.tight_layout()
    return fig, ax, peak_labels


def agilent_to_svg_workflow(
    agilent_input: str | Path,
    output_svg_path: str | Path,
    baseline_threshold: float | None = None,
) -> None:
    """Parse an Agilent acquisition folder and export an annotated SVG chromatogram."""
    input_path = Path(agilent_input)
    output_path = Path(output_svg_path)

    print(f"[*] Parsing chromatogram from: {input_path}")
    time_minutes, abundance, channel = load_agilent_chromatogram(input_path)
    print(f"[+] Loaded {len(time_minutes)} points from channel {channel!r}.")

    title_name = input_path.name if input_path.is_dir() else input_path.parent.name
    fig, _ax, peak_labels = render_chromatogram_figure(
        time_minutes,
        abundance,
        title_name,
        baseline_threshold=baseline_threshold,
    )
    print(f"[+] Marked {len(peak_labels)} peaks.")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_path, format="svg", bbox_inches="tight", transparent=True)
    plt.close(fig)

    print(f"[OK] SVG saved to: {output_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export Agilent ChemStation/MassHunter chromatograms to SVG."
    )
    parser.add_argument(
        "--input",
        required=True,
        help="Path to an Agilent *.D acquisition folder or a single *.ch trace file.",
    )
    parser.add_argument(
        "--output",
        required=True,
        help="Destination SVG path.",
    )
    parser.add_argument(
        "--baseline-threshold",
        type=float,
        default=None,
        help="Minimum peak height for RT labels (default: 5%% of max intensity).",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    try:
        agilent_to_svg_workflow(args.input, args.output, args.baseline_threshold)
    except Exception as exc:
        print(f"[X] Workflow failed: {exc}")
        raise SystemExit(1) from exc
