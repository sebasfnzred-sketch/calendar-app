(function () {
  'use strict';

  const STORAGE_KEY = 'calendarEvents';
  const MAX_PILLS = 3;

  const today = new Date();

  const state = {
    currentYear:  today.getFullYear(),
    currentMonth: today.getMonth(),
    events: [],
    editingId: null,
  };

  // ── DOM refs ──────────────────────────────────────────────────────────────

  const elMonthLabel  = document.getElementById('month-label');
  const elGrid        = document.getElementById('cal-grid');
  const elOverlay     = document.getElementById('modal-overlay');
  const elModalTitle  = document.getElementById('modal-title');
  const elForm        = document.getElementById('event-form');
  const elFieldId     = document.getElementById('field-id');
  const elFieldTitle  = document.getElementById('field-title');
  const elFieldDate   = document.getElementById('field-date');
  const elFieldStart  = document.getElementById('field-start');
  const elFieldEnd    = document.getElementById('field-end');
  const elFieldDesc   = document.getElementById('field-desc');
  const elFieldColor  = document.getElementById('field-color');
  const elErrTitle    = document.getElementById('err-title');
  const elErrDate     = document.getElementById('err-date');
  const elErrTime     = document.getElementById('err-time');
  const elBtnDelete   = document.getElementById('btn-delete');

  // ── Utilities ─────────────────────────────────────────────────────────────

  function toDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function generateId() {
    return 'evt_' + Date.now() + '_' + Math.random().toString(16).slice(2, 6);
  }

  function formatMonthLabel(year, month) {
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
      .format(new Date(year, month, 1));
  }

  // ── Storage ───────────────────────────────────────────────────────────────

  function loadEvents() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function saveEvents(events) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        alert('Storage is full. The event could not be saved.');
      }
    }
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  function getEventsForDate(dateStr) {
    return state.events
      .filter(ev => ev.date === dateStr)
      .sort((a, b) => {
        if (!a.startTime && !b.startTime) return 0;
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return a.startTime.localeCompare(b.startTime);
      });
  }

  function createEvent(data) {
    const now = new Date().toISOString();
    const ev = {
      id:          generateId(),
      title:       data.title,
      date:        data.date,
      startTime:   data.startTime,
      endTime:     data.endTime,
      description: data.description,
      color:       data.color,
      createdAt:   now,
      updatedAt:   now,
    };
    state.events.push(ev);
    saveEvents(state.events);
  }

  function updateEvent(id, data) {
    const idx = state.events.findIndex(ev => ev.id === id);
    if (idx === -1) return;
    Object.assign(state.events[idx], {
      title:       data.title,
      date:        data.date,
      startTime:   data.startTime,
      endTime:     data.endTime,
      description: data.description,
      color:       data.color,
      updatedAt:   new Date().toISOString(),
    });
    saveEvents(state.events);
  }

  function deleteEvent(id) {
    state.events = state.events.filter(ev => ev.id !== id);
    saveEvents(state.events);
  }

  // ── Calendar rendering ────────────────────────────────────────────────────

  function getCalendarDays(year, month) {
    const first = new Date(year, month, 1);
    const last  = new Date(year, month + 1, 0);
    const start = new Date(first);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(last);
    end.setDate(end.getDate() + (6 - end.getDay()));
    const days = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }

  function buildEventPill(ev) {
    const pill = document.createElement('span');
    pill.className = 'event-pill';
    pill.dataset.eventId = ev.id;
    pill.style.background = ev.color || '#4A90E2';
    const label = ev.startTime ? `${ev.startTime} ${ev.title}` : ev.title;
    pill.textContent = label;
    return pill;
  }

  function buildCell(date, isCurrentMonth) {
    const cell = document.createElement('div');
    cell.className = 'cal-cell';
    if (!isCurrentMonth) cell.classList.add('outside-month');

    const dateStr = toDateString(date);
    cell.dataset.date = dateStr;

    const todayStr = toDateString(today);
    if (dateStr === todayStr) cell.classList.add('today');

    const dayNum = document.createElement('span');
    dayNum.className = 'cell-day-number';
    dayNum.textContent = date.getDate();
    cell.appendChild(dayNum);

    const events = getEventsForDate(dateStr);
    const visible = events.slice(0, MAX_PILLS);
    const overflow = events.length - MAX_PILLS;

    visible.forEach(ev => cell.appendChild(buildEventPill(ev)));

    if (overflow > 0) {
      const more = document.createElement('span');
      more.className = 'more-events';
      more.textContent = `+${overflow} more`;
      cell.appendChild(more);
    }

    return cell;
  }

  function renderHeader() {
    elMonthLabel.textContent = formatMonthLabel(state.currentYear, state.currentMonth);
  }

  function renderGrid() {
    elGrid.innerHTML = '';
    const days = getCalendarDays(state.currentYear, state.currentMonth);
    days.forEach(date => {
      const inMonth = date.getMonth() === state.currentMonth;
      elGrid.appendChild(buildCell(date, inMonth));
    });
  }

  function renderCalendar() {
    renderHeader();
    renderGrid();
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  function clearErrors() {
    elErrTitle.textContent = '';
    elErrDate.textContent  = '';
    elErrTime.textContent  = '';
  }

  function readForm() {
    return {
      title:       elFieldTitle.value.trim(),
      date:        elFieldDate.value,
      startTime:   elFieldStart.value,
      endTime:     elFieldEnd.value,
      description: elFieldDesc.value.trim(),
      color:       elFieldColor.value,
    };
  }

  function populateForm(ev) {
    elFieldId.value    = ev.id;
    elFieldTitle.value = ev.title;
    elFieldDate.value  = ev.date;
    elFieldStart.value = ev.startTime || '';
    elFieldEnd.value   = ev.endTime   || '';
    elFieldDesc.value  = ev.description || '';
    elFieldColor.value = ev.color || '#4A90E2';
  }

  function openModalNew(dateStr) {
    state.editingId = null;
    elModalTitle.textContent = 'Add Event';
    elForm.reset();
    elFieldId.value   = '';
    elFieldDate.value = dateStr;
    elFieldColor.value = '#4A90E2';
    elBtnDelete.classList.add('hidden');
    clearErrors();
    elOverlay.classList.remove('hidden');
    elFieldTitle.focus();
  }

  function openModalEdit(ev) {
    state.editingId = ev.id;
    elModalTitle.textContent = 'Edit Event';
    populateForm(ev);
    elBtnDelete.classList.remove('hidden');
    clearErrors();
    elOverlay.classList.remove('hidden');
    elFieldTitle.focus();
  }

  function closeModal() {
    elOverlay.classList.add('hidden');
    clearErrors();
    elForm.reset();
    elFieldId.value = '';
  }

  // ── Validation ────────────────────────────────────────────────────────────

  function validateForm(data) {
    clearErrors();
    let valid = true;

    if (!data.title) {
      elErrTitle.textContent = 'Title is required.';
      valid = false;
    } else if (data.title.length > 100) {
      elErrTitle.textContent = 'Title must be 100 characters or fewer.';
      valid = false;
    }

    if (!data.date) {
      elErrDate.textContent = 'Date is required.';
      valid = false;
    } else {
      const parts = data.date.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      if (isNaN(d.getTime())) {
        elErrDate.textContent = 'Please enter a valid date.';
        valid = false;
      }
    }

    const hasStart = data.startTime !== '';
    const hasEnd   = data.endTime   !== '';

    if (hasStart !== hasEnd) {
      elErrTime.textContent = 'Please provide both a start and end time, or leave both empty.';
      valid = false;
    } else if (hasStart && hasEnd && data.endTime <= data.startTime) {
      elErrTime.textContent = 'End time must be after start time.';
      valid = false;
    }

    return valid;
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  function onPrevMonth() {
    state.currentMonth--;
    if (state.currentMonth < 0) {
      state.currentMonth = 11;
      state.currentYear--;
    }
    renderCalendar();
  }

  function onNextMonth() {
    state.currentMonth++;
    if (state.currentMonth > 11) {
      state.currentMonth = 0;
      state.currentYear++;
    }
    renderCalendar();
  }

  function onToday() {
    state.currentYear  = today.getFullYear();
    state.currentMonth = today.getMonth();
    renderCalendar();
  }

  function onGridClick(e) {
    const pill = e.target.closest('.event-pill');
    if (pill) {
      e.stopPropagation();
      const ev = state.events.find(ev => ev.id === pill.dataset.eventId);
      if (ev) openModalEdit(ev);
      return;
    }
    const cell = e.target.closest('.cal-cell');
    if (cell && cell.dataset.date) {
      openModalNew(cell.dataset.date);
    }
  }

  function onFormSubmit(e) {
    e.preventDefault();
    const data = readForm();
    if (!validateForm(data)) return;

    if (state.editingId) {
      updateEvent(state.editingId, data);
    } else {
      createEvent(data);
    }

    closeModal();
    renderCalendar();
  }

  function onDeleteClick() {
    if (!confirm('Delete this event?')) return;
    deleteEvent(state.editingId);
    closeModal();
    renderCalendar();
  }

  function onOverlayClick(e) {
    if (e.target === elOverlay) closeModal();
  }

  function onEscKey(e) {
    if (e.key === 'Escape' && !elOverlay.classList.contains('hidden')) {
      closeModal();
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  function attachHandlers() {
    document.getElementById('btn-prev').addEventListener('click', onPrevMonth);
    document.getElementById('btn-next').addEventListener('click', onNextMonth);
    document.getElementById('btn-today').addEventListener('click', onToday);
    elGrid.addEventListener('click', onGridClick);
    elForm.addEventListener('submit', onFormSubmit);
    elBtnDelete.addEventListener('click', onDeleteClick);
    elOverlay.addEventListener('click', onOverlayClick);
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('btn-cancel').addEventListener('click', closeModal);
    document.addEventListener('keydown', onEscKey);
  }

  function init() {
    state.events = loadEvents();
    attachHandlers();
    renderCalendar();
  }

  document.addEventListener('DOMContentLoaded', init);

})();
