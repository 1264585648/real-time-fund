"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner";

const Toaster = ({ ...props }) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme}
      // 外层容器：固定在页面顶部中间
      className="toaster pointer-events-none fixed inset-x-0 top-4 z-[70] flex items-start justify-center px-4 sm:top-6"
      icons={{
        success: <CircleCheckIcon className="h-4 w-4 text-emerald-500" />,
        info: <InfoIcon className="h-4 w-4 text-sky-500" />,
        warning: <TriangleAlertIcon className="h-4 w-4 text-amber-500" />,
        error: <OctagonXIcon className="h-4 w-4 text-destructive" />,
        loading: <Loader2Icon className="h-4 w-4 animate-spin text-primary" />,
      }}
      richColors
      // 统一 toast 样式，使用 ui-ux-pro-max 建议的明暗主题对比度
      toastOptions={{
        classNames: {
          toast:
            // 基础：浅色模式下使用高对比白色卡片，暗色模式使用深色卡片
            "pointer-events-auto relative flex w-full max-w-sm items-start gap-3 rounded-xl border border-slate-200 bg-white/90 text-slate-900 px-4 py-3 shadow-lg shadow-black/10 backdrop-blur-md transition-all duration-200 " +
            "data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:slide-in-from-top sm:data-[state=open]:slide-in-from-bottom " +
            "data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:slide-out-to-right " +
            "data-[swipe=move]:translate-x-[var(--sonner-swipe-move-x)] data-[swipe=move]:transition-none " +
            "data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform data-[swipe=end]:translate-x-[var(--sonner-swipe-end-x)] " +
            "dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100",
          title: "text-sm font-medium",
          description: "mt-1 text-xs text-slate-600 dark:text-slate-400",
          closeButton:
            "cursor-pointer text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          actionButton:
            "inline-flex h-8 items-center justify-center rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          cancelButton:
            "inline-flex h-8 items-center justify-center rounded-full border border-border bg-background px-3 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          // 状态色：成功/信息/警告只强化边框，错误使用红色背景，满足你“提示为红色”的需求
          success: "border-emerald-500/70",
          info: "border-sky-500/70",
          warning: "border-amber-500/70",
          error: "bg-destructive text-destructive-foreground border-destructive/80",
          loading: "border-primary/60",
        },
      }}
      {...props}
    />
  );
};

export { Toaster }
