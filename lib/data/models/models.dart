import '../../core/format.dart';

/// Bentuk data dari PostgREST. Kolom numeric bisa tiba sebagai String, jadi semua angka lewat [toNum].

typedef Json = Map<String, dynamic>;

String? _str(Json j, String key) => j[key]?.toString();

class PlatformAdmin {
  const PlatformAdmin({required this.id, required this.name, this.email});
  final String id;
  final String name;
  final String? email;

  Json toJson() => {'id': id, 'name': name, 'email': email};
  factory PlatformAdmin.fromJson(Json j) => PlatformAdmin(id: j['id'] as String, name: j['name'] as String, email: j['email'] as String?);
}

class ClientRef {
  const ClientRef({required this.id, required this.name, required this.status});
  final String id;
  final String name;
  final String status;

  factory ClientRef.fromJson(Json j) => ClientRef(id: j['id'] as String, name: j['name'] as String, status: j['status'] as String);
}

class Plan {
  const Plan({required this.code, required this.name, required this.priceMonth, required this.maxBranches, required this.maxUsers, required this.isActive, this.note});
  final String code;
  final String name;
  final num priceMonth;
  final int maxBranches;
  final int maxUsers;
  final bool isActive;
  final String? note;

  factory Plan.fromJson(Json j) => Plan(
        code: j['code'] as String,
        name: j['name'] as String,
        priceMonth: toNum(j['price_month']),
        maxBranches: toNum(j['max_branches']).toInt(),
        maxUsers: toNum(j['max_users']).toInt(),
        isActive: j['is_active'] == true,
        note: _str(j, 'note'),
      );
}

class Tenant {
  const Tenant({required this.id, required this.name, required this.clientId});
  final String id;
  final String name;
  final String clientId;

  factory Tenant.fromJson(Json j) => Tenant(id: j['id'] as String, name: j['name'] as String, clientId: j['client_id'] as String);
}

/// Baris view v_client_overview: angka agregat dihitung database. Dipakai juga sebagai ringkasan
/// langganan (kolom yang tidak diminta bernilai null/0).
class ClientOverview {
  const ClientOverview({
    required this.id,
    required this.name,
    required this.status,
    this.contactName,
    this.contactPhone,
    this.contactEmail,
    this.note,
    this.planCode,
    this.planName,
    this.priceMonth,
    this.subStatus,
    this.daysLeft,
    this.expiresAt,
    this.branchCount = 0,
    this.userCount = 0,
    this.trx30d = 0,
    this.omzet30d = 0,
    this.logs7d = 0,
    this.errors7d = 0,
  });

  final String id;
  final String name;
  final String status;
  final String? contactName;
  final String? contactPhone;
  final String? contactEmail;
  final String? note;
  final String? planCode;
  final String? planName;
  final num? priceMonth;
  final String? subStatus;
  final num? daysLeft;
  final String? expiresAt;
  final num branchCount;
  final num userCount;
  final num trx30d;
  final num omzet30d;
  final num logs7d;
  final num errors7d;

  factory ClientOverview.fromJson(Json j) => ClientOverview(
        id: j['id'] as String,
        name: j['name'] as String,
        status: (j['status'] as String?) ?? 'aktif',
        contactName: _str(j, 'contact_name'),
        contactPhone: _str(j, 'contact_phone'),
        contactEmail: _str(j, 'contact_email'),
        note: _str(j, 'note'),
        planCode: _str(j, 'plan_code'),
        planName: _str(j, 'plan_name'),
        priceMonth: j['price_month'] == null ? null : toNum(j['price_month']),
        subStatus: _str(j, 'sub_status'),
        daysLeft: j['days_left'] == null ? null : toNum(j['days_left']),
        expiresAt: _str(j, 'expires_at'),
        branchCount: toNum(j['branch_count']),
        userCount: toNum(j['user_count']),
        trx30d: toNum(j['trx_30d']),
        omzet30d: toNum(j['omzet_30d']),
        logs7d: toNum(j['logs_7d']),
        errors7d: toNum(j['errors_7d']),
      );
}

class Subscription {
  const Subscription({
    required this.id,
    required this.clientId,
    required this.planCode,
    required this.startedAt,
    required this.expiresAt,
    required this.status,
    this.note,
    this.clientName,
    this.planName,
  });

  final Object id;
  final String clientId;
  final String planCode;
  final String startedAt;
  final String expiresAt;
  final String status;
  final String? note;
  final String? clientName;
  final String? planName;

  factory Subscription.fromJson(Json j) {
    final client = j['client'];
    final plan = j['plan'];
    return Subscription(
      id: j['id'] as Object,
      clientId: j['client_id'] as String,
      planCode: j['plan_code'] as String,
      startedAt: j['started_at'] as String,
      expiresAt: j['expires_at'] as String,
      status: j['status'] as String,
      note: _str(j, 'note'),
      clientName: client is Map ? client['name'] as String? : null,
      planName: plan is Map ? plan['name'] as String? : null,
    );
  }
}

class Profile {
  const Profile({required this.id, required this.username, required this.name, required this.role, required this.tenantId, required this.createdAt});
  final String id;
  final String username;
  final String name;
  final String role;
  final String tenantId;
  final String createdAt;

  factory Profile.fromJson(Json j) => Profile(
        id: j['id'] as String,
        username: j['username'] as String,
        name: j['name'] as String,
        role: j['role'] as String,
        tenantId: j['tenant_id'] as String,
        createdAt: (j['created_at'] as String?) ?? '',
      );
}

class AuditLog {
  const AuditLog({required this.at, this.actorName, this.actorRole, required this.action, required this.entity, this.entityId, this.clientId, this.tenantId, this.detail});
  final String at;
  final String? actorName;
  final String? actorRole;
  final String action;
  final String entity;
  final String? entityId;
  final String? clientId;
  final String? tenantId;
  final Json? detail;

  factory AuditLog.fromJson(Json j) => AuditLog(
        at: j['at'] as String,
        actorName: _str(j, 'actor_name'),
        actorRole: _str(j, 'actor_role'),
        action: j['action'] as String,
        entity: j['entity'] as String,
        entityId: _str(j, 'entity_id'),
        clientId: _str(j, 'client_id'),
        tenantId: _str(j, 'tenant_id'),
        detail: j['detail'] is Map ? Map<String, dynamic>.from(j['detail'] as Map) : null,
      );
}

class ClientEvent {
  const ClientEvent({required this.at, required this.level, required this.source, required this.message, this.context, this.appVersion, this.device, this.clientId, this.tenantId});
  final String at;
  final String level;
  final String source;
  final String message;
  final Object? context;
  final String? appVersion;
  final String? device;
  final String? clientId;
  final String? tenantId;

  factory ClientEvent.fromJson(Json j) => ClientEvent(
        at: j['at'] as String,
        level: j['level'] as String,
        source: j['source'] as String,
        message: j['message'] as String,
        context: j['context'],
        appVersion: _str(j, 'app_version'),
        device: _str(j, 'device'),
        clientId: _str(j, 'client_id'),
        tenantId: _str(j, 'tenant_id'),
      );
}

class Sale {
  const Sale({required this.tenantId, required this.no, required this.at, required this.cashier, required this.method, required this.total, required this.paid, this.tenantName, this.tenantClientId});
  final String tenantId;
  final String no;
  final String at;
  final String cashier;
  final String method;
  final num total;
  final num paid;
  final String? tenantName;
  final String? tenantClientId;

  factory Sale.fromJson(Json j) {
    final tenant = j['tenant'];
    return Sale(
      tenantId: j['tenant_id'] as String,
      no: j['no'] as String,
      at: j['at'] as String,
      cashier: j['cashier'] as String,
      method: j['method'] as String,
      total: toNum(j['total']),
      paid: toNum(j['paid']),
      tenantName: tenant is Map ? tenant['name'] as String? : null,
      tenantClientId: tenant is Map ? tenant['client_id'] as String? : null,
    );
  }
}

class StockReturn {
  const StockReturn({
    required this.tenantId,
    required this.no,
    required this.at,
    required this.cashier,
    required this.kind,
    required this.itemId,
    required this.name,
    required this.unit,
    required this.qty,
    required this.amount,
    required this.reason,
    this.note,
    this.tenantName,
    this.tenantClientId,
  });

  final String tenantId;
  final String no;
  final String at;
  final String cashier;
  final String kind;
  final String itemId;
  final String name;
  final String unit;
  final num qty;
  final num amount;
  final String reason;
  final String? note;
  final String? tenantName;
  final String? tenantClientId;

  factory StockReturn.fromJson(Json j) {
    final tenant = j['tenant'];
    return StockReturn(
      tenantId: j['tenant_id'] as String,
      no: j['no'] as String,
      at: j['at'] as String,
      cashier: j['cashier'] as String,
      kind: j['kind'] as String,
      itemId: j['item_id'] as String,
      name: j['name'] as String,
      unit: j['unit'] as String,
      qty: toNum(j['qty']),
      amount: toNum(j['amount']),
      reason: j['reason'] as String,
      note: _str(j, 'note'),
      tenantName: tenant is Map ? tenant['name'] as String? : null,
      tenantClientId: tenant is Map ? tenant['client_id'] as String? : null,
    );
  }
}

class UsageDay {
  const UsageDay({required this.day, required this.trxCount, required this.trxTotal, required this.returnCount, required this.returnAmount, required this.logCount, required this.eventCount});
  final String day;
  final num trxCount;
  final num trxTotal;
  final num returnCount;
  final num returnAmount;
  final num logCount;
  final num eventCount;

  factory UsageDay.fromJson(Json j) => UsageDay(
        day: j['day'] as String,
        trxCount: toNum(j['trx_count']),
        trxTotal: toNum(j['trx_total']),
        returnCount: toNum(j['return_count']),
        returnAmount: toNum(j['return_amount']),
        logCount: toNum(j['log_count']),
        eventCount: toNum(j['event_count']),
      );
}

class PurgeSummary {
  const PurgeSummary({required this.auditDeleted, required this.eventsDeleted});
  final num auditDeleted;
  final num eventsDeleted;

  factory PurgeSummary.fromJson(Json j) => PurgeSummary(auditDeleted: toNum(j['audit_deleted']), eventsDeleted: toNum(j['events_deleted']));
}

class SystemCounts {
  const SystemCounts({this.klien, this.cabang, this.pengguna, this.logAudit, this.logTeknis});
  final int? klien;
  final int? cabang;
  final int? pengguna;
  final int? logAudit;
  final int? logTeknis;
}

class Option {
  const Option(this.value, this.label);
  final String value;
  final String label;
}
