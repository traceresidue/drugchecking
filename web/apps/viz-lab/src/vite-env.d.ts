/// <reference types="vite/client" />

declare module '@critiques' {
  const value: Record<
    string,
    {
      thesis: string;
      strengths: string[];
      weaknesses: string[];
      visualization: string;
      liveNoteTemplates?: Record<string, string>;
    }
  >;
  export default value;
}
