import 'package:brics_mobile/core/database/app_database.dart';
import 'package:flutter/widgets.dart';

/// Where to correct a refused entry, by entity. Features add their forms as
/// they arrive; an entity with no editor can still be retried or discarded.
VoidCallback? editorFor(BuildContext context, QueueRow row) {
  return null;
}
