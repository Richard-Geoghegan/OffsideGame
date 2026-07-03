// Tiny localStorage wrapper: first-load demo + best score.

export const store = {
  get seenDemo(): boolean {
    return localStorage.getItem('offside_demo') === '1';
  },
  set seenDemo(v: boolean) {
    localStorage.setItem('offside_demo', v ? '1' : '0');
  },
  get best(): number {
    return Number(localStorage.getItem('offside_best') ?? 0);
  },
  set best(v: number) {
    localStorage.setItem('offside_best', String(v));
  },
};
