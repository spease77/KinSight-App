"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Header } from "@/components/Header";
import { AgendaFeed } from "@/components/agenda/AgendaFeed";
import { AgendaHourlyGrid } from "@/components/agenda/AgendaHourlyGrid";
import { AgendaSearchBar } from "@/components/agenda/AgendaSearchBar";
import { AgendaTimeFrameSwitcher } from "@/components/agenda/AgendaTimeFrameSwitcher";
import { AddMeetingModal } from "@/components/AddMeetingModal";
import { readApiJson } from "@/lib/api/read-json";
import { resolveAgendaInteractions } from "@/lib/agenda/mock-scheduled-interactions";
import { filterInteractionsByQuery } from "@/lib/agenda/search-interactions";
import {
  filterInteractionsForTimeFrame,
  groupInteractionsByDate,
} from "@/lib/agenda/time-frame";
import {
  DEFAULT_AGENDA_TIME_FRAME,
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddMeetingOpen, setIsAddMeetingOpen] = useState(false);
  const [editingInteraction, setEditingInteraction] =
    useState<ScheduledInteraction | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);
  const [headerScrolled, setHeaderScrolled] = useState(false);

  useEffect(() => {
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

  const agendaInteractions = useMemo(
    () => resolveAgendaInteractions(interactions),
    [interactions]
  );

  const filteredInteractions = useMemo(() => {
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
      if (interaction.contactId.startsWith("mock-")) return;
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
            : "text-slate-400 hover:bg-card-hover hover:text-foreground"
        }`}
        aria-label={isSearchOpen ? "Close agenda search" : "Search agenda"}
        aria-pressed={isSearchOpen}
      >
        <Search className="h-5 w-5" strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={() => setIsAddMeetingOpen(true)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-card-hover hover:text-foreground"
        aria-label="Add meeting"
      >
        <Plus className="h-5 w-5" strokeWidth={2} />
      </button>
    </>
  );

  const isCalendarView =
    timeFrame === "day" || timeFrame === "week" || timeFrame === "month";
  const showEmptyStateMessage =
    !hasScheduledInView && (!isCalendarView || isSearchActive);

  return (
    <>
      <div className="agenda-page flex min-h-0 flex-1 flex-col">
        <div
          className={`agenda-page-header ${
            headerScrolled ? "agenda-page-header--scrolled" : ""
          }`}
        >
          <Header
            title="Agenda"
            headerActions={headerActions}
            sticky={false}
          />
          <AgendaSearchBar
            open={isSearchOpen}
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onClose={handleSearchClose}
          />
          <div className="px-5 pb-2">
            <AgendaTimeFrameSwitcher
              timeFrame={timeFrame}
              onTimeFrameChange={setTimeFrame}
            />
          </div>
        </div>

        <main className="flex min-h-0 flex-1 flex-col gap-2 px-5 pb-0">
        {isLoading ? (
          <p className="type-meta py-8 text-center">Loading agenda…</p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-red-400" role="alert">
            {error}
          </p>
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
              <p className="py-3 text-center text-sm text-muted">
                {isSearchActive && hasTimeFrameResults
                  ? "No meetings match your search."
                  : "Nothing scheduled. Use '+' button or home mic to add."}
              </p>
            ) : null}
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
