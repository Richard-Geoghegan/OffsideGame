// Tiny localStorage wrapper: first-load demo, best score, league level.

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
  get level(): number {
    return Number(localStorage.getItem('offside_level') ?? 0);
  },
  set level(v: number) {
    localStorage.setItem('offside_level', String(v));
  },
};
