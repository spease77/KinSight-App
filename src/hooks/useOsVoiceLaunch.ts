"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useVoiceExperience } from "@/contexts/VoiceExperienceContext";
import {
  parseOsVoiceLaunch,
  stripOsVoiceParams,
} from "@/lib/voice/os-voice-deeplink";
import {
  installNativeBridgeHandlers,
  subscribeNativeVoiceLaunch,
} from "@/lib/voice/native-bridge";

export function useOsVoiceLaunch(): void {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { handleOsVoiceLaunch } = useVoiceExperience();

  useEffect(() => {
    installNativeBridgeHandlers();
    return subscribeNativeVoiceLaunch(handleOsVoiceLaunch);
  }, [handleOsVoiceLaunch]);

  useEffect(() => {
    const payload = parseOsVoiceLaunch(searchParams);
    if (!payload) return;

    handleOsVoiceLaunch(payload);

    const nextQuery = stripOsVoiceParams(searchParams);
    router.replace(`${pathname}${nextQuery}`, { scroll: false });
  }, [handleOsVoiceLaunch, pathname, router, searchParams]);
}
