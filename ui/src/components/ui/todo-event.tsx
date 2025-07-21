"use client";
import { formatTodoDuration, getTodoColor } from "@/lib/todo-utils";
import type { Todo } from "@/lib/types";
import { CheckCircle2, Circle, Clock } from "lucide-react";

interface TodoEventProps {
  event: Todo;
  onClick?: (todo: Todo) => void;
  isCurrentMonth?: boolean;
}

function isAllDay(event: Todo) {
  return (
    event.assigned_date &&
    !event.duration_minutes &&
    event.assigned_date.getHours() === 0 &&
    event.assigned_date.getMinutes() === 0
  );
}

export function TodoEvent({
  event,
  onClick,
  isCurrentMonth = true,
}: TodoEventProps) {
  const color = getTodoColor(event);

  const eventClasses = [
    "todo-event",
    isCurrentMonth ? "current-month" : "cross-month",
    event.completed ? "completed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={eventClasses}
      style={
        isCurrentMonth
          ? {
              backgroundColor: color,
              color: "white",
            }
          : {}
      }
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(event);
      }}
    >
      <div className="todo-title">
        {event.completed ? (
          <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
        ) : (
          <Circle className="h-3 w-3 flex-shrink-0" />
        )}
        <span>{event.title}</span>
      </div>
      {!isAllDay(event) && event.assigned_date && (
        <div className="todo-duration">
          <Clock className="h-2 w-2" />
          <span>
            {formatTodoDuration(
              event.assigned_date,
              event.duration_minutes || 15,
            )}
          </span>
        </div>
      )}
    </div>
  );
}
