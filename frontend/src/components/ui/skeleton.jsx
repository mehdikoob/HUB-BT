import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      className={cn("animate-shimmer rounded-md bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]", className)}
      style={{
        backgroundSize: '200% 100%',
        animation: 'shimmer 2s infinite linear'
      }}
      {...props} />
  );
}

export { Skeleton }
