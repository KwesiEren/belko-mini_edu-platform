import { useState } from "react";
import { Icon, type IconName } from "../components/Icon";

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  event_type: "exam" | "meeting" | "event" | "holiday" | "academic";
  date: string;
  time?: string;
  location?: string;
}

const INITIAL_EVENTS: CalendarEvent[] = [
  {
    id: "evt-01",
    title: "Mid-Term Continuous Assessment Week",
    description: "Assessment tests across JSS 1 to SSS 3",
    event_type: "exam",
    date: "2026-02-23",
    time: "08:30 AM",
    location: "Main Examination Hall",
  },
  {
    id: "evt-02",
    title: "PTA General Executive Meeting",
    description: "Discussion on school infrastructure development and term progress",
    event_type: "meeting",
    date: "2026-03-07",
    time: "10:00 AM",
    location: "School Auditorium",
  },
  {
    id: "evt-03",
    title: "Inter-House Athletics & Sports Competition",
    description: "Annual sports tournament featuring track, field and relay races",
    event_type: "event",
    date: "2026-03-20",
    time: "09:00 AM",
    location: "School Sports Complex",
  },
  {
    id: "evt-04",
    title: "Easter & Mid-Year Term Break",
    description: "Official public holiday and school break",
    event_type: "holiday",
    date: "2026-04-10",
    time: "All day",
    location: "Campus Closed",
  },
  {
    id: "evt-05",
    title: "Academic Staff Curriculum Review",
    description: "Departmental alignment on scheme of work and lesson notes",
    event_type: "academic",
    date: "2026-02-18",
    time: "02:00 PM",
    location: "Staff Conference Room",
  },
];

const EVENT_TYPE_BADGES: Record<CalendarEvent["event_type"], { label: string; bg: string; text: string; icon: IconName }> = {
  exam: { label: "Examination", bg: "bg-rose-50 border-rose-200", text: "text-rose-700", icon: "book" },
  meeting: { label: "Meeting", bg: "bg-blue-50 border-blue-200", text: "text-blue-700", icon: "students" },
  event: { label: "School Event", bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", icon: "calendar" },
  holiday: { label: "Public Holiday", bg: "bg-amber-50 border-amber-200", text: "text-amber-700", icon: "clock" },
  academic: { label: "Academic", bg: "bg-purple-50 border-purple-200", text: "text-purple-700", icon: "grades" },
};

export default function CalendarPage({
  token: _token,
  role = "principal",
}: {
  token: string;
  role?: string;
}) {
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    try {
      const saved = localStorage.getItem("belko_calendar_events");
      return saved ? JSON.parse(saved) : INITIAL_EVENTS;
    } catch {
      return INITIAL_EVENTS;
    }
  });

  const [filterType, setFilterType] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    event_type: "event" as CalendarEvent["event_type"],
    date: new Date().toISOString().slice(0, 10),
    time: "09:00 AM",
    location: "Main Hall",
  });

  const saveEvents = (updated: CalendarEvent[]) => {
    setEvents(updated);
    try {
      localStorage.setItem("belko_calendar_events", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title.trim()) return;
    const item: CalendarEvent = {
      id: "evt-" + Date.now(),
      ...newEvent,
    };
    saveEvents([item, ...events]);
    setModalOpen(false);
    setNewEvent({
      title: "",
      description: "",
      event_type: "event",
      date: new Date().toISOString().slice(0, 10),
      time: "09:00 AM",
      location: "Main Hall",
    });
  };

  const handleDeleteEvent = (id: string) => {
    if (confirm("Are you sure you want to remove this event?")) {
      saveEvents(events.filter((ev) => ev.id !== id));
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (filterType === "all") return true;
    return ev.event_type === filterType;
  });

  const canManage = role === "principal" || role === "super_admin" || role === "secretary";

  return (
    <div className="calendar-page space-y-6">
      <section className="hero">
        <div>
          <span className="eyebrow">Academic Schedule</span>
          <h1>School Calendar & Events</h1>
          <p>Keep track of terms, assessment weeks, meetings, exams, and holidays.</p>
        </div>
        <div className="hero-actions">
          {canManage && (
            <button
              type="button"
              className="button button-primary"
              onClick={() => setModalOpen(true)}
            >
              <Icon name="plus" /> Add Event
            </button>
          )}
        </div>
      </section>

      {/* Quick Stats Grid */}
      <section className="stats-grid" aria-label="Calendar overview">
        <div className="stat-card">
          <div className="stat-icon blue"><Icon name="calendar" /></div>
          <div className="stat-label">Total Scheduled</div>
          <div className="stat-value">{events.length}</div>
          <div className="stat-note blue">Events this term</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber"><Icon name="book" /></div>
          <div className="stat-label">Examinations</div>
          <div className="stat-value">{events.filter((e) => e.event_type === "exam").length}</div>
          <div className="stat-note amber">CA & Term Finals</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon teal"><Icon name="students" /></div>
          <div className="stat-label">PTA & Meetings</div>
          <div className="stat-value">{events.filter((e) => e.event_type === "meeting").length}</div>
          <div className="stat-note teal">Staff & Stakeholders</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon violet"><Icon name="clock" /></div>
          <div className="stat-label">Holidays</div>
          <div className="stat-value">{events.filter((e) => e.event_type === "holiday").length}</div>
          <div className="stat-note violet">Public & School Breaks</div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="panel">
        <div className="panel-heading flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2>Upcoming Schedule</h2>
            <p>Chronological list of all academic and extracurricular events.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Filter:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-slate-300 text-sm px-3 py-1.5 bg-white text-slate-800"
            >
              <option value="all">All Events</option>
              <option value="exam">Examinations</option>
              <option value="meeting">Meetings</option>
              <option value="event">School Events</option>
              <option value="holiday">Holidays</option>
              <option value="academic">Academic Staff</option>
            </select>
          </div>
        </div>

        <div className="p-6">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Icon name="calendar" size={36} />
              <p className="mt-2 text-sm font-medium">No events found for this filter.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((ev) => {
                const badge = EVENT_TYPE_BADGES[ev.event_type] || EVENT_TYPE_BADGES.event;
                return (
                  <div
                    key={ev.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center justify-center h-14 w-14 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 shrink-0">
                        <span className="text-xs uppercase font-bold text-slate-500">
                          {new Date(ev.date).toLocaleString("default", { month: "short" })}
                        </span>
                        <span className="text-lg font-bold text-slate-900 leading-tight">
                          {new Date(ev.date).getDate()}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-semibold text-slate-900">{ev.title}</h3>
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border font-medium ${badge.bg} ${badge.text}`}
                          >
                            <Icon name={badge.icon} size={12} />
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-0.5">{ev.description}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                          {ev.time && (
                            <span className="flex items-center gap-1">
                              <Icon name="clock" size={14} />
                              {ev.time}
                            </span>
                          )}
                          {ev.location && (
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              📍 {ev.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {canManage && (
                      <div className="mt-3 sm:mt-0 flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="text-xs text-rose-600 hover:text-rose-800 p-2 rounded-lg hover:bg-rose-50 transition"
                          title="Delete event"
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Modal: Add Event */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Add School Event</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <form onSubmit={handleAddEvent} className="space-y-4">
              <div className="field">
                <label className="text-xs font-semibold text-slate-700 uppercase">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. End of Term Speech & Prize Giving"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full text-sm px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label className="text-xs font-semibold text-slate-700 uppercase">Event Type</label>
                  <select
                    value={newEvent.event_type}
                    onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value as any })}
                    className="w-full text-sm px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="exam">Examination</option>
                    <option value="meeting">Meeting</option>
                    <option value="event">School Event</option>
                    <option value="holiday">Holiday</option>
                    <option value="academic">Academic Staff</option>
                  </select>
                </div>

                <div className="field">
                  <label className="text-xs font-semibold text-slate-700 uppercase">Date</label>
                  <input
                    type="date"
                    required
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full text-sm px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label className="text-xs font-semibold text-slate-700 uppercase">Time</label>
                  <input
                    type="text"
                    placeholder="e.g. 09:30 AM"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="w-full text-sm px-3 py-2 border rounded-lg"
                  />
                </div>

                <div className="field">
                  <label className="text-xs font-semibold text-slate-700 uppercase">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Auditorium"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    className="w-full text-sm px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="field">
                <label className="text-xs font-semibold text-slate-700 uppercase">Description</label>
                <textarea
                  rows={3}
                  placeholder="Additional details regarding attendees, agenda, or materials..."
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full text-sm px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="button button-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="button button-primary">
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
