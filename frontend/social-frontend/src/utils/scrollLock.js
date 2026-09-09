let lockCount = 0;

export const lockScroll = () => {
  lockCount++;
  if (lockCount === 1) {
    document.body.style.overflow = "hidden";
  }
};

export const unlockScroll = () => {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = "";
  }
};
