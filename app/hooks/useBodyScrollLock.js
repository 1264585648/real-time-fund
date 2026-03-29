import { useEffect, useRef } from "react";

// 全局状态：支持多个弹框“引用计数”式地共用一个滚动锁
let scrollLockCount = 0;
let lockedScrollY = 0;
let originalBodyPosition = "";
let originalBodyTop = "";

function lockBodyScroll() {
  scrollLockCount += 1;

  // 只有第一个锁才真正修改 body，避免多弹框互相干扰
  if (scrollLockCount === 1) {
    lockedScrollY = window.scrollY || window.pageYOffset || 0;
    originalBodyPosition = document.body.style.position || "";
    originalBodyTop = document.body.style.top || "";

    requestAnimationFrame(() => {
      document.body.style.top = `-${lockedScrollY}px`;
      document.body.style.width = "100%";
      document.body.style.position = "fixed";
    });
  }
}

function unlockBodyScroll() {
  if (scrollLockCount === 0) return;

  scrollLockCount -= 1;

  // 只有全部弹框都关闭时才恢复滚动位置
  if (scrollLockCount === 0) {
    const scrollY = lockedScrollY;

    document.body.style.position = originalBodyPosition;
    document.body.style.top = originalBodyTop;
    document.body.style.width = "";

    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
  }
}

export function useBodyScrollLock(open) {
  const isLockedRef = useRef(false);

  useEffect(() => {
    if (open && !isLockedRef.current) {
      lockBodyScroll();
      isLockedRef.current = true;
    } else if (!open && isLockedRef.current) {
      unlockBodyScroll();
      isLockedRef.current = false;
    }

    // 组件卸载或依赖变化时兜底释放锁
    return () => {
      if (isLockedRef.current) {
        unlockBodyScroll();
        isLockedRef.current = false;
      }
    };
  }, [open]);
}
