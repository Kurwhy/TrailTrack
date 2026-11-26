import { useEffect } from "react";

export function usePageMeta(title: string, noindex = false) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    let robots: HTMLMetaElement | null = null;
    if (noindex) {
      robots = document.createElement("meta");
      robots.name = "robots";
      robots.content = "noindex, nofollow";
      document.head.appendChild(robots);
    }

    return () => {
      document.title = previousTitle;
      if (robots) robots.remove();
    };
  }, [title, noindex]);
}
