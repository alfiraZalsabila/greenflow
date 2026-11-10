import type { IconProps } from ".";

export function LeafIcon(props: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 4c0 8-5 14-13 14H4c0-8 5-14 13-14z" />
      <path d="M4 20c3-6 7-10 13-13" />
    </svg>
  );
}
