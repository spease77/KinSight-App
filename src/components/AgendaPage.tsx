"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Header } from "@/components/Header";
import { PageHeader } from "@/components/PageHeader";
import { AgendaFeed } from "@/components/agenda/AgendaFeed";
import { AgendaHourlyGrid } from "@/components/agenda/AgendaHourlyGrid";
import { AgendaListView } from "@/components/agenda/AgendaListView";
import { AgendaSearchBar } from "@/components/agenda/AgendaSearchBar";
import { AgendaTimeFrameSwitcher } from "@/components/agenda/AgendaTimeFrameSwitcher";
import { AddMeetingModal } from "@/components/AddMeetingModal";
import { readApiJson } from "@/lib/api/read-json";
import { ensureCalendarDeviceId } from "@/lib/calendar/device-id-client";
import { resolveAgendaInteractions } from "@/lib/agenda/mock-scheduled-interactions";
import { filterInteractionsByQuery } from "@/lib/agenda/search-interactions";
import {
  filterInteractionsForTimeFrame,
  groupInteractionsByDate,
} from "@/lib/agenda/time-frame";
import {
  loadAgendaViewPreference,
  saveAgendaViewPreference,
} from "@/lib/agenda/view-preference";
import {
  DEFAULT_AGENDA_TIME_FRAME,
  isReadOnlyInteraction,
  type AgendaTimeFrame,
  type ScheduledInteraction,
} from "@/types/scheduled-interaction";

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function dateFromKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function AgendaPage() {
  const pathname = usePathname();
  const [timeFrame, setTimeFrame] =
    useState<AgendaTimeFrame>(DEFAULT_AGENDA_TIME_FRAME);
  const [selectedDate, setSelectedDate] = useState(startOfToday);
  const [selectedInteractionId, setSelectedInteractionId] = useState<
    string | null
  >(null);
  const [interactions, setInteractions] = useState<ScheduledInteraction[]>([]);
  const [googleInteractions, setGoogleInteractions] = useState<
    ScheduledInteraction[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddMeetingOpen, setIsAddMeetingOpen] = useState(false);
  const [editingInteraction, setEditingInteraction] =
    useState<ScheduledInteraction | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);
  const [headerScrolled, setHeaderScrolled] = useState(false);

  // Layout effect: lock before first paint so the page doesn't flash unlocked.
  useLayoutEffect(() => {
    if (pathname !== "/agenda") return;

    const scrollEl = document.querySelector<HTMLElement>(".app-scroll");
    if (!scrollEl) return;

    scrollEl.classList.add("agenda-scroll-locked");

    return () => {
      scrollEl.classList.remove("agenda-scroll-locked");
    };
  }, [pathname]);

  useEffect(() => {
    const scrollEl = document.querySelector<HTMLElement>(".app-scroll");
    if (!scrollEl) return;

    const handleScroll = () => {
      setHeaderScrolled(scrollEl.scrollTop > 6);
    };

    handleScroll();
    scrollEl.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scrollEl.removeEventListener("scroll", handleScroll);
    };
  }, [pathname, timeFrame]);

  const loadInteractions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/scheduled-interactions", {
        cache: "no-store",
      });
      const data = await readApiJson<{
        interactions?: ScheduledInteraction[];
        error?: string;
      }>(res);

      if (!res.ok) {
        throw new Error(data.error ?? "Could not load agenda.");
      }

      setInteractions(data.interactions ?? []);
    } catch (err) {
      setInteractions([]);
      setError(err instanceof Error ? err.message : "Could not load agenda.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInteractions();
  }, [loadInteractions]);

  // Read-only events from the connected Google Calendar(s). Loaded separately so
  // a Google hiccup never blocks KinSight's own meetings.
  const loadGoogleEvents = useCallback(async () => {
    try {
      ensureCalendarDeviceId();
      const res = await fetch("/api/calendar/google/events", {
        cache: "no-store",
      });
      const data = await readApiJson<{
        connected?: boolean;
        interactions?: ScheduledInteraction[];
        error?: string;
      }>(res);

      if (!res.ok) return;
      setGoogleInteractions(data.connected ? (data.interactions ?? []) : []);
    } catch {
      // keep whatever was loaded last
    }
  }, []);

  useEffect(() => {
    void loadGoogleEvents();

    // Refresh when returning to the app (e.g. after connecting in Settings).
    let lastLoad = Date.now();
    const handleVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastLoad < 30_000) return;
      lastLoad = Date.now();
      void loadGoogleEvents();
    };
    document.addEventListener("visibilitychange", handleVisible);
    return () => document.removeEventListener("visibilitychange", handleVisible);
  }, [loadGoogleEvents]);

  useEffect(() => {
    setTimeFrame(loadAgendaViewPreference());
  }, []);

  const handleTimeFrameChange = useCallback((value: AgendaTimeFrame) => {
    setTimeFrame(value);
    saveAgendaViewPreference(value);
  }, []);

  useEffect(() => {
    if (pathname === "/agenda") {
      setSelectedDate(startOfToday());
      setSelectedInteractionId(null);
      setIsSearchOpen(false);
      setSearchQuery("");
    }
  }, [pathname]);

  const handleSearchToggle = useCallback(() => {
    setIsSearchOpen((current) => {
      if (current) setSearchQuery("");
      return !current;
    });
  }, []);

  const handleSearchClose = useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery("");
  }, []);

  const agendaInteractions = useMemo(() => {
    const syncedIds = new Set(
      interactions
        .map((item) => item.externalEventId)
        .filter((id): id is string => Boolean(id))
    );
    const googleOnly = googleInteractions.filter(
      (item) => !item.externalEventId || !syncedIds.has(item.externalEventId)
    );
    const combined = [...interactions, ...googleOnly];
    return resolveAgendaInteractions(combined).slice().sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
  }, [interactions, googleInteractions]);

  const filteredInteractions = useMemo(() => {
    if (timeFrame === "list") {
      return agendaInteractions;
    }
    if (timeFrame === "day") {
      return filterInteractionsForTimeFrame(
        agendaInteractions,
        "day",
        selectedDate
      );
    }
    if (timeFrame === "month") {
      return filterInteractionsForTimeFrame(
        agendaInteractions,
        "month",
        selectedDate
      );
    }
    return filterInteractionsForTimeFrame(agendaInteractions, timeFrame);
  }, [agendaInteractions, timeFrame, selectedDate]);

  const searchedInteractions = useMemo(
    () => filterInteractionsByQuery(filteredInteractions, searchQuery),
    [filteredInteractions, searchQuery]
  );

  const filteredGroups = useMemo(
    () => groupInteractionsByDate(searchedInteractions),
    [searchedInteractions]
  );

  const scrollToInteraction = useCallback((interactionId: string) => {
    setSelectedInteractionId(interactionId);

    requestAnimationFrame(() => {
      const element = document.getElementById(`agenda-event-${interactionId}`);
      element?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, []);

  const handleInteractionSelect = useCallback(
    (interactionId: string) => {
      const interaction = agendaInteractions.find(
        (item) => item.id === interactionId
      );
      if (interaction) {
        const eventDate = new Date(interaction.scheduledAt);
        eventDate.setHours(0, 0, 0, 0);
        setSelectedDate(eventDate);
      }
      scrollToInteraction(interactionId);
    },
    [agendaInteractions, scrollToInteraction]
  );

  const closeMeetingModal = useCallback(() => {
    setIsAddMeetingOpen(false);
    setEditingInteraction(null);
  }, []);

  const handleInteractionEdit = useCallback(
    (interaction: ScheduledInteraction) => {
      if (isReadOnlyInteraction(interaction)) return;
      setEditingInteraction(interaction);
    },
    []
  );

  const handleDateHeaderSelect = useCallback((dateKey: string) => {
    setSelectedDate(dateFromKey(dateKey));
    setSelectedInteractionId(null);
  }, []);

  const isMeetingModalOpen = isAddMeetingOpen || editingInteraction != null;

  const hasScheduledInView = searchedInteractions.length > 0;
  const hasTimeFrameResults = filteredInteractions.length > 0;
  const isSearchActive = searchQuery.trim().length > 0;

  const headerActions = (
    <>
      <button
        type="button"
        onClick={handleSearchToggle}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
          isSearchOpen || isSearchActive
            ? "bg-card-hover text-foreground"
            : "text-foreground opacity-100 hover:bg-card-hover"
        }`}
        aria-label={isSearchOpen ? "Close agenda search" : "Search agenda"}
        aria-pressed={isSearchOpen}
      >
        <Search className="h-5 w-5" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={() => setIsAddMeetingOpen(true)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground opacity-100 transition-colors hover:bg-card-hover"
        aria-label="Add meeting"
      >
        <Plus className="h-5 w-5" strokeWidth={2} />
      </button>
    </>
  );

  const isCalendarView =
    timeFrame === "day" || timeFrame === "week" || timeFrame === "month";
  const isListView = timeFrame === "list";
  const showEmptyStateMessage =
    !hasScheduledInView && (!isCalendarView || isSearchActive) && !isListView;

  return (
    <>
      <div className="agenda-page flex h-full min-h-0 flex-col overflow-hidden">
        <PageHeader
          className={
            headerScrolled ? "agenda-page-header agenda-page-header--scrolled" : "agenda-page-header"
          }
        >
          <Header title="Agenda" headerActions={headerActions} />
        </PageHeader>
        <div
          className={`agenda-page-toolbar shrink-0 ${
            headerScrolled ? "agenda-page-header--scrolled" : ""
          }`}
        >
          <AgendaSearchBar
            open={isSearchOpen}
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onClose={handleSearchClose}
          />
          <div className="px-1 pb-2">
            <AgendaTimeFrameSwitcher
              timeFrame={timeFrame}
              onTimeFrameChange={handleTimeFrameChange}
            />
          </div>
        </div>

        <main className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-0 pb-0">
        {isLoading ? (
          <p className="type-meta py-8 text-center">Loading agenda…</p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : (
          <>
            {isListView ? (
              <AgendaListView
                interactions={searchedInteractions}
                onInteractionEdit={handleInteractionEdit}
                emptyMessage={
                  isSearchActive && agendaInteractions.length > 0
                    ? "No meetings match your search."
                    : undefined
                }
              />
            ) : (
              <>
                <AgendaHourlyGrid
                  selectedDate={selectedDate}
                  timeFrame={timeFrame}
                  interactions={
                    isSearchActive ? searchedInteractions : agendaInteractions
                  }
                  selectedInteractionId={selectedInteractionId}
                  onSelectedDateChange={setSelectedDate}
                  onInteractionSelect={handleInteractionSelect}
                />

                {hasScheduledInView ? (
                  <>
                    <div
                      className="border-t border-border-green/60"
                      role="separator"
                      aria-hidden="true"
                    />

                    <AgendaFeed
                      ref={feedRef}
                      groups={filteredGroups}
                      selectedInteractionId={selectedInteractionId}
                      onDateHeaderSelect={handleDateHeaderSelect}
                      onInteractionEdit={handleInteractionEdit}
                    />
                  </>
                ) : showEmptyStateMessage ? (
                  isSearchActive && hasTimeFrameResults ? (
                    <p className="py-3 text-center text-sm text-muted">
                      No meetings match your search.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2 py-3 text-center text-sm text-muted">
                      <p>Nothing scheduled.</p>
                      <p>Use &apos;+&apos; button or home mic to add.</p>
                    </div>
                  )
                ) : null}
              </>
            )}
          </>
        )}
        </main>
      </div>

      <AddMeetingModal
        open={isMeetingModalOpen}
        interaction={editingInteraction}
        onClose={closeMeetingModal}
        onSaved={() => {
          void loadInteractions();
        }}
        onDeleted={() => {
          void loadInteractions();
        }}
      />
    </>
  );
}
