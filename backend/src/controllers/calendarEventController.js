const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const calendarEventModel = require('../models/calendarEventModel');

function normalizeEventPayload(input = {}, fallback = {}) {
  const payload = {};

  if (Object.prototype.hasOwnProperty.call(input, 'title') || Object.prototype.hasOwnProperty.call(fallback, 'title')) {
    payload.title = String(input.title ?? fallback.title ?? '').trim();
  }

  if (Object.prototype.hasOwnProperty.call(input, 'description') || Object.prototype.hasOwnProperty.call(fallback, 'description')) {
    const nextValue = Object.prototype.hasOwnProperty.call(input, 'description') ? input.description : fallback.description;
    payload.description = nextValue == null ? null : String(nextValue).trim() || null;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'starts_at') || Object.prototype.hasOwnProperty.call(fallback, 'starts_at')) {
    payload.starts_at = input.starts_at ?? fallback.starts_at ?? null;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'ends_at') || Object.prototype.hasOwnProperty.call(fallback, 'ends_at')) {
    payload.ends_at = input.ends_at ?? fallback.ends_at ?? null;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'location') || Object.prototype.hasOwnProperty.call(fallback, 'location')) {
    const nextValue = Object.prototype.hasOwnProperty.call(input, 'location') ? input.location : fallback.location;
    payload.location = nextValue == null ? null : String(nextValue).trim() || null;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'color') || Object.prototype.hasOwnProperty.call(fallback, 'color')) {
    payload.color = String(input.color ?? fallback.color ?? 'pink').trim() || 'pink';
  }

  return payload;
}

function ensureValidEventRange(startsAt, endsAt) {
  const startDate = new Date(startsAt);
  const endDate = new Date(endsAt);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new AppError('Informe uma data e hora validas para o evento.', 400);
  }

  if (endDate.getTime() <= startDate.getTime()) {
    throw new AppError('O fim do evento deve acontecer depois do inicio.', 400);
  }
}

exports.list = asyncHandler(async (req, res) => {
  const events = await calendarEventModel.listRange({
    from: req.query.from,
    to: req.query.to,
  });

  res.json(events);
});

exports.getById = asyncHandler(async (req, res) => {
  const event = await calendarEventModel.findById(req.params.id);

  if (!event) {
    throw new AppError('Evento não encontrado.', 404);
  }

  res.json(event);
});

exports.create = asyncHandler(async (req, res) => {
  const payload = normalizeEventPayload(req.body);
  ensureValidEventRange(payload.starts_at, payload.ends_at);

  const event = await calendarEventModel.create(payload, req.user);
  res.status(201).json(event);
});

exports.update = asyncHandler(async (req, res) => {
  const current = await calendarEventModel.findById(req.params.id);
  if (!current) {
    throw new AppError('Evento não encontrado.', 404);
  }

  const payload = normalizeEventPayload(req.body, current);
  ensureValidEventRange(payload.starts_at, payload.ends_at);

  const event = await calendarEventModel.update(req.params.id, payload, req.user);
  res.json(event);
});

exports.remove = asyncHandler(async (req, res) => {
  const removed = await calendarEventModel.remove(req.params.id);
  if (!removed) {
    throw new AppError('Evento não encontrado.', 404);
  }

  res.status(204).send();
});
