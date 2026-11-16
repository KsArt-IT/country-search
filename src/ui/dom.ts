type Props = {
  readonly className?: string;
  /** Set through textContent, so it is never parsed as HTML. */
  readonly text?: string;
  readonly attrs?: Readonly<Record<string, string>>;
};

export const element = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  { className, text, attrs }: Props = {},
  children: readonly Node[] = [],
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  if (attrs) {
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  }
  node.append(...children);
  return node;
};
