-- ============================================================
-- STN PQ's — Esquema inicial de base de datos
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('user', 'admin', 'courier');

CREATE TYPE shipment_status AS ENUM (
  'Pendiente',
  'En_Sucursal',
  'Asignado',
  'En_Camino',
  'En_Entrega',
  'Entregado',
  'Entrega_Fallida',
  'Devuelto_a_Sucursal',
  'Cancelado'
);

CREATE TYPE shipment_type AS ENUM ('S2S', 'S2D');

CREATE TYPE shipment_modality AS ENUM ('Normal', 'Express');

CREATE TYPE content_type AS ENUM ('estandar', 'fragil', 'perecedero', 'peligroso');

CREATE TYPE transaction_type AS ENUM ('recarga', 'pago_envio', 'reembolso', 'compensacion');

CREATE TYPE transaction_status AS ENUM ('pendiente', 'completado', 'fallido', 'revertido');

CREATE TYPE payment_method_type AS ENUM ('credito', 'debito');

CREATE TYPE discount_type AS ENUM ('porcentaje', 'monto_fijo');

CREATE TYPE incident_type AS ENUM (
  'paquete_perdido',
  'paquete_danado',
  'entrega_incorrecta',
  'retraso',
  'otro'
);

CREATE TYPE incident_status AS ENUM ('abierto', 'en_revision', 'resuelto', 'cerrado');

CREATE TYPE claim_status AS ENUM ('pendiente', 'en_revision', 'aprobado', 'rechazado', 'pagado');

CREATE TYPE ticket_status AS ENUM ('abierto', 'en_proceso', 'resuelto', 'cerrado');

CREATE TYPE ticket_priority AS ENUM ('baja', 'media', 'alta', 'urgente');

CREATE TYPE message_type AS ENUM ('texto', 'imagen', 'archivo');

CREATE TYPE sender_role AS ENUM ('user', 'courier', 'admin', 'ai');

CREATE TYPE notification_type AS ENUM (
  'envio_creado',
  'cambio_estado',
  'en_entrega',
  'entregado',
  'entrega_fallida',
  'devuelto_sucursal',
  'pago_exitoso',
  'ticket_respondido',
  'recordatorio_programado',
  'nuevo_nivel_descuento',
  'incidencia_critica'
);

CREATE TYPE evidence_type AS ENUM ('firma_digital', 'foto', 'codigo_verificacion');

CREATE TYPE ai_message_role AS ENUM ('user', 'assistant', 'system');

-- ============================================================
-- TABLAS
-- ============================================================

-- Usuarios
CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email               VARCHAR(255) NOT NULL UNIQUE,
  password_hash       VARCHAR(255) NOT NULL,
  full_name           VARCHAR(255) NOT NULL,
  phone               VARCHAR(30),
  avatar_url          TEXT,
  balance             DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  role                user_role NOT NULL DEFAULT 'user',
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  totp_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  totp_secret_enc     TEXT,
  backup_codes_enc    TEXT,
  discount_level      INTEGER NOT NULL DEFAULT 0,
  last_login          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sucursales
CREATE TABLE branches (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL,
  address     TEXT NOT NULL,
  lat         DECIMAL(10, 7) NOT NULL,
  lng         DECIMAL(10, 7) NOT NULL,
  schedule    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Repartidores
CREATE TABLE couriers (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                VARCHAR(255) NOT NULL UNIQUE,
  password_hash        VARCHAR(255) NOT NULL,
  full_name            VARCHAR(255) NOT NULL,
  phone                VARCHAR(30),
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  is_available         BOOLEAN NOT NULL DEFAULT FALSE,
  current_lat          DECIMAL(10, 7),
  current_lng          DECIMAL(10, 7),
  location_updated_at  TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Envíos
CREATE TABLE shipments (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracking_code          VARCHAR(20) NOT NULL UNIQUE,
  verification_code      VARCHAR(6) NOT NULL,
  sender_id              UUID NOT NULL REFERENCES users(id),
  origin_branch_id       UUID NOT NULL REFERENCES branches(id),
  dest_branch_id         UUID REFERENCES branches(id),
  dest_address           TEXT,
  dest_lat               DECIMAL(10, 7),
  dest_lng               DECIMAL(10, 7),
  shipment_type          shipment_type NOT NULL,
  modality               shipment_modality NOT NULL DEFAULT 'Normal',
  weight_kg              DECIMAL(8, 3) NOT NULL,
  length_cm              DECIMAL(8, 2) NOT NULL,
  width_cm               DECIMAL(8, 2) NOT NULL,
  height_cm              DECIMAL(8, 2) NOT NULL,
  content_type           content_type NOT NULL DEFAULT 'estandar',
  special_instructions   TEXT,
  declared_value         DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  has_insurance          BOOLEAN NOT NULL DEFAULT FALSE,
  insurance_cost         DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  base_cost              DECIMAL(12, 2) NOT NULL,
  last_mile_cost         DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  express_surcharge      DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  discount_amount        DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  total_cost             DECIMAL(12, 2) NOT NULL,
  status                 shipment_status NOT NULL DEFAULT 'Pendiente',
  delivery_attempts      INTEGER NOT NULL DEFAULT 0,
  incident_flag          BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_courier_id    UUID REFERENCES couriers(id),
  scheduled_pickup_at    TIMESTAMPTZ,
  estimated_delivery_at  TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Historial de estados de envíos
CREATE TABLE shipment_status_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id     UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  from_status     shipment_status,
  to_status       shipment_status NOT NULL,
  changed_by      UUID REFERENCES users(id),
  changed_by_role user_role,
  location_lat    DECIMAL(10, 7),
  location_lng    DECIMAL(10, 7),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Evidencias de entrega
CREATE TABLE delivery_evidences (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id       UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  evidence_type     evidence_type NOT NULL,
  file_url          TEXT,
  receiver_name     VARCHAR(255),
  receiver_relation VARCHAR(100),
  failure_reason    TEXT,
  location_lat      DECIMAL(10, 7),
  location_lng      DECIMAL(10, 7),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transacciones
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id),
  shipment_id     UUID REFERENCES shipments(id),
  type            transaction_type NOT NULL,
  amount          DECIMAL(12, 2) NOT NULL,
  balance_after   DECIMAL(12, 2) NOT NULL,
  concept         TEXT NOT NULL,
  payment_method  VARCHAR(50),
  external_tx_id  VARCHAR(255),
  status          transaction_status NOT NULL DEFAULT 'completado',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Métodos de pago guardados
CREATE TABLE payment_methods (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_type   payment_method_type NOT NULL,
  last_four   VARCHAR(4) NOT NULL,
  brand       VARCHAR(50) NOT NULL,
  token_enc   TEXT NOT NULL,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tarifas
CREATE TABLE rates (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                 VARCHAR(255) NOT NULL,
  distance_min_km      INTEGER NOT NULL,
  distance_max_km      INTEGER NOT NULL,
  base_price           DECIMAL(12, 2) NOT NULL,
  price_per_extra_kg   DECIMAL(12, 2) NOT NULL,
  last_mile_base       DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  last_mile_per_kg     DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  express_multiplier   DECIMAL(5, 2) NOT NULL DEFAULT 1.40,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  valid_from           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to             TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Códigos promocionales
CREATE TABLE promo_codes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            VARCHAR(50) NOT NULL UNIQUE,
  discount_type   discount_type NOT NULL,
  discount_value  DECIMAL(10, 2) NOT NULL,
  max_uses        INTEGER,
  used_count      INTEGER NOT NULL DEFAULT 0,
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to        TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Incidencias
CREATE TABLE incidents (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_number   VARCHAR(20) NOT NULL UNIQUE,
  shipment_id       UUID NOT NULL REFERENCES shipments(id),
  reported_by       UUID REFERENCES users(id),
  type              incident_type NOT NULL,
  description       TEXT NOT NULL,
  status            incident_status NOT NULL DEFAULT 'abierto',
  is_critical       BOOLEAN NOT NULL DEFAULT FALSE,
  is_auto_generated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reclamaciones
CREATE TABLE claims (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_number    VARCHAR(20) NOT NULL UNIQUE,
  incident_id     UUID NOT NULL REFERENCES incidents(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  description     TEXT NOT NULL,
  claimed_amount  DECIMAL(12, 2) NOT NULL,
  approved_amount DECIMAL(12, 2),
  status          claim_status NOT NULL DEFAULT 'pendiente',
  admin_notes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

-- Tickets de soporte
CREATE TABLE support_tickets (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number  VARCHAR(20) NOT NULL UNIQUE,
  user_id        UUID NOT NULL REFERENCES users(id),
  shipment_id    UUID REFERENCES shipments(id),
  subject        VARCHAR(255) NOT NULL,
  description    TEXT NOT NULL,
  status         ticket_status NOT NULL DEFAULT 'abierto',
  priority       ticket_priority NOT NULL DEFAULT 'media',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mensajes de chat
CREATE TABLE chat_messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id  UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  sender_id    UUID NOT NULL,
  sender_role  sender_role NOT NULL,
  content      TEXT NOT NULL,
  message_type message_type NOT NULL DEFAULT 'texto',
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversaciones con el Agente IA
CREATE TABLE ai_conversations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id),
  session_id  VARCHAR(100) NOT NULL,
  rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at    TIMESTAMPTZ
);

-- Mensajes del Agente IA
CREATE TABLE ai_messages (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id  UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role             ai_message_role NOT NULL,
  content          TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notificaciones
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            notification_type NOT NULL,
  title           VARCHAR(255) NOT NULL,
  body            TEXT NOT NULL,
  reference_id    UUID,
  reference_type  VARCHAR(50),
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Logs de auditoría
CREATE TABLE audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id     UUID REFERENCES users(id),
  actor_role   user_role,
  action       VARCHAR(100) NOT NULL,
  entity_type  VARCHAR(100) NOT NULL,
  entity_id    UUID,
  before_data  JSONB,
  after_data   JSONB,
  ip_address   INET,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Libreta de direcciones
CREATE TABLE address_book (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label       VARCHAR(100) NOT NULL,
  address     TEXT NOT NULL,
  lat         DECIMAL(10, 7),
  lng         DECIMAL(10, 7),
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Turnos de repartidores
CREATE TABLE courier_shifts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  courier_id   UUID NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  shift_start  TIMESTAMPTZ NOT NULL,
  shift_end    TIMESTAMPTZ,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_shipments_sender_id ON shipments(sender_id);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_tracking_code ON shipments(tracking_code);
CREATE INDEX idx_shipments_assigned_courier ON shipments(assigned_courier_id);
CREATE INDEX idx_shipments_created_at ON shipments(created_at DESC);

CREATE INDEX idx_shipment_status_history_shipment_id ON shipment_status_history(shipment_id);
CREATE INDEX idx_delivery_evidences_shipment_id ON delivery_evidences(shipment_id);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_shipment_id ON transactions(shipment_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);

CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

CREATE INDEX idx_chat_messages_shipment_id ON chat_messages(shipment_id);
CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_messages_conversation_id ON ai_messages(conversation_id);

CREATE INDEX idx_incidents_shipment_id ON incidents(shipment_id);
CREATE INDEX idx_claims_incident_id ON claims(incident_id);
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);

CREATE INDEX idx_address_book_user_id ON address_book(user_id);
CREATE INDEX idx_courier_shifts_courier_id ON courier_shifts(courier_id);

-- ============================================================
-- DATOS INICIALES (tarifas base)
-- ============================================================

INSERT INTO rates (name, distance_min_km, distance_max_km, base_price, price_per_extra_kg, last_mile_base, last_mile_per_kg, express_multiplier)
VALUES
  ('Tramo Local (0-100 km)',        0,    100,  500.00,  80.00, 1500.00, 200.00, 1.40),
  ('Tramo Regional (101-500 km)',   101,  500,  1200.00, 150.00, 1500.00, 200.00, 1.40),
  ('Tramo Nacional (501-1000 km)',  501,  1000, 2500.00, 250.00, 1500.00, 200.00, 1.40),
  ('Tramo Larga Distancia (>1000 km)', 1001, 99999, 4500.00, 400.00, 1500.00, 200.00, 1.40);
