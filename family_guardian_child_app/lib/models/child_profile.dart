class Rule {
  final String id;
  final String name;
  final String? ruleType;
  final Map<String, dynamic>? config;
  final bool enabled;

  Rule({
    required this.id,
    required this.name,
    this.ruleType,
    this.config,
    this.enabled = true,
  });

  factory Rule.fromJson(Map<String, dynamic> json) {
    return Rule(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Rule',
      ruleType: json['ruleType']?.toString(),
      config: json['config'] as Map<String, dynamic>?,
      enabled: json['enabled'] as bool? ?? true,
    );
  }

  // Helper for UI/Legacy compatibility
  String get title => name;
  String get description => ruleType ?? '';
  String? get category => ruleType;
  bool get active => enabled;
}

class PendingCommand {
  final String id;
  final String command;
  final String status;

  PendingCommand({
    required this.id,
    required this.command,
    required this.status,
  });

  factory PendingCommand.fromJson(Map<String, dynamic> json) {
    return PendingCommand(
      id: json['id']?.toString() ?? '',
      command: json['command']?.toString() ?? '',
      status: json['status']?.toString() ?? 'pending',
    );
  }
}

class ChildProfile {
  final String id;
  final String? name;
  final String displayName;
  final int? batteryPercent;
  final String? networkType;
  final bool isLocked;
  final String? platform;
  final DateTime? lastSeenAt;
  final String? deviceToken;
  final List<Rule> rules;
  final List<PendingCommand> pendingCommands;

  ChildProfile({
    required this.id,
    this.name,
    required this.displayName,
    this.batteryPercent,
    this.networkType,
    this.isLocked = false,
    this.platform,
    this.lastSeenAt,
    this.deviceToken,
    required this.rules,
    this.pendingCommands = const [],
  });

  factory ChildProfile.fromJson(Map<String, dynamic> json) {
    final childData = json['child'] as Map<String, dynamic>? ?? json;
    
    final rulesJson = (json['rules'] as List?) ?? const [];
    final commandsJson = (json['pendingCommands'] as List?) ?? const [];

    return ChildProfile(
      id: childData['id']?.toString() ?? '',
      name: childData['name']?.toString(),
      displayName: childData['display_name']?.toString() ??
          childData['name']?.toString() ??
          'My Account',
      batteryPercent: childData['batteryPercent'] as int?,
      networkType: childData['networkType']?.toString(),
      isLocked: childData['isLocked'] as bool? ?? false,
      platform: childData['platform']?.toString(),
      lastSeenAt: childData['lastSeenAt'] != null 
          ? DateTime.tryParse(childData['lastSeenAt'].toString()) 
          : null,
      deviceToken: childData['deviceToken']?.toString(),
      rules: rulesJson
          .whereType<Map<String, dynamic>>()
          .map((r) => Rule.fromJson(r))
          .toList(),
      pendingCommands: commandsJson
          .whereType<Map<String, dynamic>>()
          .map((c) => PendingCommand.fromJson(c))
          .toList(),
    );
  }
}
