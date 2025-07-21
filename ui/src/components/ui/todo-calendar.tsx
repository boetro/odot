"use client";

import { useState, useMemo, useCallback } from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import { TodoEvent } from "./todo-event";
import "react-big-calendar/lib/css/react-big-calendar.css";
import type { CalendarProps, Todo } from "@/lib/types";
import { getTodoColor } from "@/lib/todo-utils";
import { useNavigate } from "@tanstack/react-router";

// Transform Todo for calendar display
type CalendarTodo = Todo & {
  start: Date;
  end: Date;
  allDay: boolean;
};

const localizer = momentLocalizer(moment);

export function TodoCalendar({
  todos,
  onTodoSelect,
  onSlotSelect,
  selectedView,
  setSelectedView,
  className = "",
}: CalendarProps) {
  const [date, setDate] = useState(new Date());

  // Transform todos to calendar events
  const calendarEvents = useMemo((): CalendarTodo[] => {
    return todos
      .map((todo) => {
        if (!todo.assigned_date) {
          return null;
        }
        const date = todo.assigned_date
          ? new Date(todo.assigned_date)
          : new Date();
        const duration = todo.duration_minutes || 60; // Default 1 hour
        const endDate = new Date(date.getTime() + duration * 60 * 1000);

        return {
          ...todo,
          start: date,
          end: endDate,
          allDay: !todo.duration_minutes, // All day if no duration specified
        };
      })
      .filter((event) => event !== null);
  }, [todos]);

  // Custom event style getter
  const eventStyleGetter = useCallback(
    (event: Todo) => {
      const backgroundColor = getTodoColor(event);

      // Check if event is in a different month than the current view
      const eventMonth = event.assigned_date!.getMonth();
      const viewMonth = date.getMonth();
      const isCurrentMonth = eventMonth === viewMonth;

      // Use muted colors for events in adjacent months
      const opacity = event.completed ? 0.4 : isCurrentMonth ? 1 : 0.6;
      const borderOpacity = isCurrentMonth ? 1 : 0.4;

      return {
        style: {
          backgroundColor: isCurrentMonth
            ? backgroundColor
            : "hsl(var(--muted))",
          borderColor: isCurrentMonth
            ? backgroundColor
            : "hsl(var(--muted-foreground))",
          color: isCurrentMonth ? "white" : "hsl(var(--muted-foreground))",
          border: `1px solid ${isCurrentMonth ? backgroundColor : "hsl(var(--border))"}`,
          borderRadius: "4px",
          opacity,
          fontSize: "12px",
          borderOpacity,
        },
        className: `${!isCurrentMonth ? "cross-month" : ""} ${event.completed ? "completed" : ""}`,
      };
    },
    [date],
  );

  const navigate = useNavigate();

  // Custom event component
  const EventComponent = useCallback(
    ({ event }: { event: CalendarTodo }) => (
      <TodoEvent
        event={event}
        onClick={(todo) =>
          navigate({
            to: "/todos/$todoId",
            params: { todoId: todo.id.toString() },
          })
        }
      />
    ),
    [navigate],
  );

  // Custom agenda event component
  const AgendaEventComponent = useCallback(
    ({ event }: { event: CalendarTodo }) => (
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: getTodoColor(event) }}
        />
        <span className={event.completed ? "line-through opacity-60" : ""}>
          {event.title}
        </span>
        {/* <Badge variant="outline" className="ml-auto">
          {event.priority}
        </Badge> */}
      </div>
    ),
    [],
  );

  return (
    <div className={`w-full h-full ${className}`}>
      <div className="h-full p-4">
        <Calendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          titleAccessor="title"
          allDayAccessor="allDay"
          view={selectedView}
          onView={setSelectedView}
          date={date}
          onNavigate={setDate}
          eventPropGetter={eventStyleGetter}
          components={{
            event: EventComponent,
            agenda: {
              event: AgendaEventComponent,
            },
          }}
          onSelectEvent={(event) => {
            onTodoSelect?.(event as CalendarTodo);
          }}
          onSelectSlot={(slotInfo) => {
            onSlotSelect?.(slotInfo);
          }}
          selectable
          popup
          showMultiDayTimes
          step={15}
          timeslots={4}
          defaultView={Views.MONTH}
          views={[Views.MONTH, Views.WEEK, Views.DAY]}
          formats={{
            timeGutterFormat: "HH:mm",
            eventTimeRangeFormat: ({ start, end }) =>
              `${moment(start).format("HH:mm")} - ${moment(end).format("HH:mm")}`,
            agendaTimeRangeFormat: ({ start, end }) =>
              `${moment(start).format("HH:mm")} - ${moment(end).format("HH:mm")}`,
          }}
          className="todo-calendar"
        />
      </div>
    </div>
  );
}
