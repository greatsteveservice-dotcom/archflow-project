'use client';
import { useEffect } from 'react';

declare global {
  interface Window {
    ym?: (...args: any[]) => void;
  }
}

export default function YandexMetrika() {
  const id = process.env.NEXT_PUBLIC_YM_ID;
  if (!id) return null;

  useEffect(() => {
    // Load Yandex.Metrika script
    const script = document.createElement('script');
    script.innerHTML = `
      (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*new Date();
      for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
      k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
      (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
      ym(${id}, "init", {
        clickmap:true,
        trackLinks:true,
        accurateTrackBounce:true,
        webvisor:true
      });
    `;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [id]);

  return (
    <noscript>
      <div>
        <img src={`https://mc.yandex.ru/watch/${id}`} style={{ position: 'absolute', left: '-9999px' }} alt="" />
      </div>
    </noscript>
  );
}
