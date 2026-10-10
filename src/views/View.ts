export interface View {
  render(): string;
  mount(container: HTMLElement): void;
  unmount(): void;
}
