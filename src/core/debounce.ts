export const debounce = <Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number,
): ((...args: Args) => void) => {
  let timerId: ReturnType<typeof setTimeout> | undefined;

  return (...args: Args): void => {
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      timerId = undefined;
      fn(...args);
    }, delay);
  };
};
