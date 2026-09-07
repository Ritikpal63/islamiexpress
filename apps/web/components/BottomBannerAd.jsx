"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronUp, X } from "lucide-react";

export default function BottomBannerAd() {
  const [visible, setVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [closing, setClosing] = useState(false);
  const toggleButton = useRef(null);
  const interacted = useRef(false);

  useEffect(() => {
    if (interacted.current) toggleButton.current?.focus({ preventScroll: true });
  }, [collapsed]);

  function toggleAd() {
    if (closing) return;
    interacted.current = true;
    if (collapsed) {
      setCollapsed(false);
    } else if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCollapsed(true);
    } else {
      setClosing(true);
    }
  }

  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => {
      setCollapsed(true);
      setClosing(false);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [closing]);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 800);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  if (collapsed) {
    return (
      <button
        ref={toggleButton}
        type="button"
        className="bottom-banner-ad__reopen"
        aria-label="Show advertisement"
        aria-expanded={false}
        onClick={toggleAd}
      >
        <ChevronUp size={22} aria-hidden="true" />
        <span>Ad</span>
      </button>
    );
  }

  return (
    <>
      <div
        className={`bottom-banner-space${closing ? " bottom-banner-space--closing" : ""}`}
        aria-hidden="true"
      />
      <aside
        className={`bottom-banner-ad${closing ? " bottom-banner-ad--closing" : ""}`}
        aria-label="Advertisement"
      >
        <div className="bottom-banner-ad__header">
          <span>Advertisement</span>
          <button
            ref={toggleButton}
            type="button"
            className="bottom-banner-ad__close"
            aria-label="Hide advertisement"
            aria-expanded={true}
            aria-disabled={closing}
            onClick={toggleAd}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <img
          className="bottom-banner-ad__image"
          src="/assets/ads/bottom-ad.jpeg"
          alt="Servokon advertisement"
          width={2906}
          height={281}
          onError={() => setVisible(false)}
        />
      </aside>
    </>
  );
}
