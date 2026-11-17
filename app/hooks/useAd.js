import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export function trackAdEvent(adId, eventType) {
  if (!adId) return;
  void apiFetch(`/public/ads/${adId}/event`, {
    method: "POST",
    body: JSON.stringify({ event_type: eventType }),
  });
}

export default function useAd(position, fallbackPosition) {
  const [ad, setAd] = useState(null);
  useEffect(() => {
    let active = true;
    setAd(null);
    if (!position) return () => { active = false; };
    const fetchAd = async () => {
      let result = await apiFetch(`/public/ads/${encodeURIComponent(position)}`);
      if (!result?.data && fallbackPosition) {
        result = await apiFetch(`/public/ads/${encodeURIComponent(fallbackPosition)}`);
      }
      if (!active) return;
      const nextAd = result?.data || null;
      setAd(nextAd);
      if (nextAd?.id) trackAdEvent(nextAd.id, "impression");
    };
    fetchAd();
    return () => { active = false; };
  }, [position, fallbackPosition]);
  return ad;
}
