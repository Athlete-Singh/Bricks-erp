// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint, type=warning, deprecated_member_use, deprecated_member_use_from_same_package
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'masters.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$Party {

 String get id; String get name; List<String> get partyTypes; bool get isActive;
/// Create a copy of Party
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$PartyCopyWith<Party> get copyWith => _$PartyCopyWithImpl<Party>(this as Party, _$identity);

  /// Serializes this Party to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as Party;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Party&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&const DeepCollectionEquality().equals(other.partyTypes, _this.partyTypes)&&(identical(other.isActive, _this.isActive) || other.isActive == _this.isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as Party;
  return Object.hash(runtimeType,_this.id,_this.name,const DeepCollectionEquality().hash(_this.partyTypes),_this.isActive);
}

@override
String toString() {
  final _this = this as Party;
  return 'Party(id: ${_this.id}, name: ${_this.name}, partyTypes: ${_this.partyTypes}, isActive: ${_this.isActive})';
}


}

/// @nodoc
abstract mixin class $PartyCopyWith<$Res>  {
  factory $PartyCopyWith(Party value, $Res Function(Party) _then) = _$PartyCopyWithImpl;
@useResult
$Res call({
 String id, String name, List<String> partyTypes, bool isActive
});




}
/// @nodoc
class _$PartyCopyWithImpl<$Res>
    implements $PartyCopyWith<$Res> {
  _$PartyCopyWithImpl(this._self, this._then);

  final Party _self;
  final $Res Function(Party) _then;

/// Create a copy of Party
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? partyTypes = null,Object? isActive = null,}) {
  return _then(Party(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,partyTypes: null == partyTypes ? _self.partyTypes : partyTypes // ignore: cast_nullable_to_non_nullable
as List<String>,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [Party].
extension PartyPatterns on Party {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Party value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Party() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Party value)  $default,){
final _that = this;
switch (_that) {
case _Party():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Party value)?  $default,){
final _that = this;
switch (_that) {
case _Party() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  List<String> partyTypes,  bool isActive)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Party() when $default != null:
return $default(_that.id,_that.name,_that.partyTypes,_that.isActive);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  List<String> partyTypes,  bool isActive)  $default,) {final _that = this;
switch (_that) {
case _Party():
return $default(_that.id,_that.name,_that.partyTypes,_that.isActive);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  List<String> partyTypes,  bool isActive)?  $default,) {final _that = this;
switch (_that) {
case _Party() when $default != null:
return $default(_that.id,_that.name,_that.partyTypes,_that.isActive);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Party implements Party {
  const _Party({required this.id, required this.name,  List<String> partyTypes = const <String>[], this.isActive = true}): _partyTypes = partyTypes;
  factory _Party.fromJson(Map<String, dynamic> json) => _$PartyFromJson(json);

@override final  String id;
@override final  String name;
 final  List<String> _partyTypes;
@override@JsonKey() List<String> get partyTypes {
  if (_partyTypes is EqualUnmodifiableListView) return _partyTypes;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_partyTypes);
}

@override@JsonKey() final  bool isActive;

/// Create a copy of Party
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$PartyCopyWith<_Party> get copyWith => __$PartyCopyWithImpl<_Party>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$PartyToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _Party&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&const DeepCollectionEquality().equals(other.partyTypes, _partyTypes)&&(identical(other.isActive, isActive) || other.isActive == isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,const DeepCollectionEquality().hash(_partyTypes),isActive);
}

@override
String toString() {
    return 'Party(id: $id, name: $name, partyTypes: $partyTypes, isActive: $isActive)';
}


}

/// @nodoc
abstract mixin class _$PartyCopyWith<$Res> implements $PartyCopyWith<$Res> {
  factory _$PartyCopyWith(_Party value, $Res Function(_Party) _then) = __$PartyCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, List<String> partyTypes, bool isActive
});




}
/// @nodoc
class __$PartyCopyWithImpl<$Res>
    implements _$PartyCopyWith<$Res> {
  __$PartyCopyWithImpl(this._self, this._then);

  final _Party _self;
  final $Res Function(_Party) _then;

/// Create a copy of Party
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? partyTypes = null,Object? isActive = null,}) {
  return _then(_Party(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,partyTypes: null == partyTypes ? _self._partyTypes : partyTypes // ignore: cast_nullable_to_non_nullable
as List<String>,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}


/// @nodoc
mixin _$Unit {

 String get id; String get name; String get abbreviation;
/// Create a copy of Unit
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$UnitCopyWith<Unit> get copyWith => _$UnitCopyWithImpl<Unit>(this as Unit, _$identity);

  /// Serializes this Unit to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as Unit;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Unit&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.abbreviation, _this.abbreviation) || other.abbreviation == _this.abbreviation));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as Unit;
  return Object.hash(runtimeType,_this.id,_this.name,_this.abbreviation);
}

@override
String toString() {
  final _this = this as Unit;
  return 'Unit(id: ${_this.id}, name: ${_this.name}, abbreviation: ${_this.abbreviation})';
}


}

/// @nodoc
abstract mixin class $UnitCopyWith<$Res>  {
  factory $UnitCopyWith(Unit value, $Res Function(Unit) _then) = _$UnitCopyWithImpl;
@useResult
$Res call({
 String id, String name, String abbreviation
});




}
/// @nodoc
class _$UnitCopyWithImpl<$Res>
    implements $UnitCopyWith<$Res> {
  _$UnitCopyWithImpl(this._self, this._then);

  final Unit _self;
  final $Res Function(Unit) _then;

/// Create a copy of Unit
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? abbreviation = null,}) {
  return _then(Unit(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,abbreviation: null == abbreviation ? _self.abbreviation : abbreviation // ignore: cast_nullable_to_non_nullable
as String,
  ));
}

}


/// Adds pattern-matching-related methods to [Unit].
extension UnitPatterns on Unit {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Unit value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Unit() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Unit value)  $default,){
final _that = this;
switch (_that) {
case _Unit():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Unit value)?  $default,){
final _that = this;
switch (_that) {
case _Unit() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  String abbreviation)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Unit() when $default != null:
return $default(_that.id,_that.name,_that.abbreviation);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  String abbreviation)  $default,) {final _that = this;
switch (_that) {
case _Unit():
return $default(_that.id,_that.name,_that.abbreviation);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  String abbreviation)?  $default,) {final _that = this;
switch (_that) {
case _Unit() when $default != null:
return $default(_that.id,_that.name,_that.abbreviation);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Unit implements Unit {
  const _Unit({required this.id, required this.name, required this.abbreviation});
  factory _Unit.fromJson(Map<String, dynamic> json) => _$UnitFromJson(json);

@override final  String id;
@override final  String name;
@override final  String abbreviation;

/// Create a copy of Unit
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$UnitCopyWith<_Unit> get copyWith => __$UnitCopyWithImpl<_Unit>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$UnitToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _Unit&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.abbreviation, abbreviation) || other.abbreviation == abbreviation));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,abbreviation);
}

@override
String toString() {
    return 'Unit(id: $id, name: $name, abbreviation: $abbreviation)';
}


}

/// @nodoc
abstract mixin class _$UnitCopyWith<$Res> implements $UnitCopyWith<$Res> {
  factory _$UnitCopyWith(_Unit value, $Res Function(_Unit) _then) = __$UnitCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, String abbreviation
});




}
/// @nodoc
class __$UnitCopyWithImpl<$Res>
    implements _$UnitCopyWith<$Res> {
  __$UnitCopyWithImpl(this._self, this._then);

  final _Unit _self;
  final $Res Function(_Unit) _then;

/// Create a copy of Unit
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? abbreviation = null,}) {
  return _then(_Unit(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,abbreviation: null == abbreviation ? _self.abbreviation : abbreviation // ignore: cast_nullable_to_non_nullable
as String,
  ));
}


}


/// @nodoc
mixin _$Item {

 String get id; String get name; String get category; String get unitId; bool get isActive;
/// Create a copy of Item
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ItemCopyWith<Item> get copyWith => _$ItemCopyWithImpl<Item>(this as Item, _$identity);

  /// Serializes this Item to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as Item;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Item&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.category, _this.category) || other.category == _this.category)&&(identical(other.unitId, _this.unitId) || other.unitId == _this.unitId)&&(identical(other.isActive, _this.isActive) || other.isActive == _this.isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as Item;
  return Object.hash(runtimeType,_this.id,_this.name,_this.category,_this.unitId,_this.isActive);
}

@override
String toString() {
  final _this = this as Item;
  return 'Item(id: ${_this.id}, name: ${_this.name}, category: ${_this.category}, unitId: ${_this.unitId}, isActive: ${_this.isActive})';
}


}

/// @nodoc
abstract mixin class $ItemCopyWith<$Res>  {
  factory $ItemCopyWith(Item value, $Res Function(Item) _then) = _$ItemCopyWithImpl;
@useResult
$Res call({
 String id, String name, String category, String unitId, bool isActive
});




}
/// @nodoc
class _$ItemCopyWithImpl<$Res>
    implements $ItemCopyWith<$Res> {
  _$ItemCopyWithImpl(this._self, this._then);

  final Item _self;
  final $Res Function(Item) _then;

/// Create a copy of Item
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? category = null,Object? unitId = null,Object? isActive = null,}) {
  return _then(Item(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,category: null == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as String,unitId: null == unitId ? _self.unitId : unitId // ignore: cast_nullable_to_non_nullable
as String,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [Item].
extension ItemPatterns on Item {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Item value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Item() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Item value)  $default,){
final _that = this;
switch (_that) {
case _Item():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Item value)?  $default,){
final _that = this;
switch (_that) {
case _Item() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  String category,  String unitId,  bool isActive)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Item() when $default != null:
return $default(_that.id,_that.name,_that.category,_that.unitId,_that.isActive);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  String category,  String unitId,  bool isActive)  $default,) {final _that = this;
switch (_that) {
case _Item():
return $default(_that.id,_that.name,_that.category,_that.unitId,_that.isActive);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  String category,  String unitId,  bool isActive)?  $default,) {final _that = this;
switch (_that) {
case _Item() when $default != null:
return $default(_that.id,_that.name,_that.category,_that.unitId,_that.isActive);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Item implements Item {
  const _Item({required this.id, required this.name, required this.category, required this.unitId, this.isActive = true});
  factory _Item.fromJson(Map<String, dynamic> json) => _$ItemFromJson(json);

@override final  String id;
@override final  String name;
@override final  String category;
@override final  String unitId;
@override@JsonKey() final  bool isActive;

/// Create a copy of Item
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ItemCopyWith<_Item> get copyWith => __$ItemCopyWithImpl<_Item>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ItemToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _Item&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.category, category) || other.category == category)&&(identical(other.unitId, unitId) || other.unitId == unitId)&&(identical(other.isActive, isActive) || other.isActive == isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,category,unitId,isActive);
}

@override
String toString() {
    return 'Item(id: $id, name: $name, category: $category, unitId: $unitId, isActive: $isActive)';
}


}

/// @nodoc
abstract mixin class _$ItemCopyWith<$Res> implements $ItemCopyWith<$Res> {
  factory _$ItemCopyWith(_Item value, $Res Function(_Item) _then) = __$ItemCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, String category, String unitId, bool isActive
});




}
/// @nodoc
class __$ItemCopyWithImpl<$Res>
    implements _$ItemCopyWith<$Res> {
  __$ItemCopyWithImpl(this._self, this._then);

  final _Item _self;
  final $Res Function(_Item) _then;

/// Create a copy of Item
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? category = null,Object? unitId = null,Object? isActive = null,}) {
  return _then(_Item(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,category: null == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as String,unitId: null == unitId ? _self.unitId : unitId // ignore: cast_nullable_to_non_nullable
as String,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}


/// @nodoc
mixin _$BrickType {

 String get id; String get grade; String get itemId; bool get isActive;
/// Create a copy of BrickType
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$BrickTypeCopyWith<BrickType> get copyWith => _$BrickTypeCopyWithImpl<BrickType>(this as BrickType, _$identity);

  /// Serializes this BrickType to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as BrickType;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is BrickType&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.grade, _this.grade) || other.grade == _this.grade)&&(identical(other.itemId, _this.itemId) || other.itemId == _this.itemId)&&(identical(other.isActive, _this.isActive) || other.isActive == _this.isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as BrickType;
  return Object.hash(runtimeType,_this.id,_this.grade,_this.itemId,_this.isActive);
}

@override
String toString() {
  final _this = this as BrickType;
  return 'BrickType(id: ${_this.id}, grade: ${_this.grade}, itemId: ${_this.itemId}, isActive: ${_this.isActive})';
}


}

/// @nodoc
abstract mixin class $BrickTypeCopyWith<$Res>  {
  factory $BrickTypeCopyWith(BrickType value, $Res Function(BrickType) _then) = _$BrickTypeCopyWithImpl;
@useResult
$Res call({
 String id, String grade, String itemId, bool isActive
});




}
/// @nodoc
class _$BrickTypeCopyWithImpl<$Res>
    implements $BrickTypeCopyWith<$Res> {
  _$BrickTypeCopyWithImpl(this._self, this._then);

  final BrickType _self;
  final $Res Function(BrickType) _then;

/// Create a copy of BrickType
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? grade = null,Object? itemId = null,Object? isActive = null,}) {
  return _then(BrickType(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,grade: null == grade ? _self.grade : grade // ignore: cast_nullable_to_non_nullable
as String,itemId: null == itemId ? _self.itemId : itemId // ignore: cast_nullable_to_non_nullable
as String,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [BrickType].
extension BrickTypePatterns on BrickType {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _BrickType value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _BrickType() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _BrickType value)  $default,){
final _that = this;
switch (_that) {
case _BrickType():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _BrickType value)?  $default,){
final _that = this;
switch (_that) {
case _BrickType() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String grade,  String itemId,  bool isActive)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _BrickType() when $default != null:
return $default(_that.id,_that.grade,_that.itemId,_that.isActive);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String grade,  String itemId,  bool isActive)  $default,) {final _that = this;
switch (_that) {
case _BrickType():
return $default(_that.id,_that.grade,_that.itemId,_that.isActive);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String grade,  String itemId,  bool isActive)?  $default,) {final _that = this;
switch (_that) {
case _BrickType() when $default != null:
return $default(_that.id,_that.grade,_that.itemId,_that.isActive);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _BrickType implements BrickType {
  const _BrickType({required this.id, required this.grade, required this.itemId, this.isActive = true});
  factory _BrickType.fromJson(Map<String, dynamic> json) => _$BrickTypeFromJson(json);

@override final  String id;
@override final  String grade;
@override final  String itemId;
@override@JsonKey() final  bool isActive;

/// Create a copy of BrickType
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$BrickTypeCopyWith<_BrickType> get copyWith => __$BrickTypeCopyWithImpl<_BrickType>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$BrickTypeToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _BrickType&&(identical(other.id, id) || other.id == id)&&(identical(other.grade, grade) || other.grade == grade)&&(identical(other.itemId, itemId) || other.itemId == itemId)&&(identical(other.isActive, isActive) || other.isActive == isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,grade,itemId,isActive);
}

@override
String toString() {
    return 'BrickType(id: $id, grade: $grade, itemId: $itemId, isActive: $isActive)';
}


}

/// @nodoc
abstract mixin class _$BrickTypeCopyWith<$Res> implements $BrickTypeCopyWith<$Res> {
  factory _$BrickTypeCopyWith(_BrickType value, $Res Function(_BrickType) _then) = __$BrickTypeCopyWithImpl;
@override @useResult
$Res call({
 String id, String grade, String itemId, bool isActive
});




}
/// @nodoc
class __$BrickTypeCopyWithImpl<$Res>
    implements _$BrickTypeCopyWith<$Res> {
  __$BrickTypeCopyWithImpl(this._self, this._then);

  final _BrickType _self;
  final $Res Function(_BrickType) _then;

/// Create a copy of BrickType
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? grade = null,Object? itemId = null,Object? isActive = null,}) {
  return _then(_BrickType(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,grade: null == grade ? _self.grade : grade // ignore: cast_nullable_to_non_nullable
as String,itemId: null == itemId ? _self.itemId : itemId // ignore: cast_nullable_to_non_nullable
as String,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}


/// @nodoc
mixin _$Warehouse {

 String get id; String get siteId; String get name; bool get isActive;
/// Create a copy of Warehouse
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$WarehouseCopyWith<Warehouse> get copyWith => _$WarehouseCopyWithImpl<Warehouse>(this as Warehouse, _$identity);

  /// Serializes this Warehouse to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as Warehouse;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Warehouse&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.siteId, _this.siteId) || other.siteId == _this.siteId)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.isActive, _this.isActive) || other.isActive == _this.isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as Warehouse;
  return Object.hash(runtimeType,_this.id,_this.siteId,_this.name,_this.isActive);
}

@override
String toString() {
  final _this = this as Warehouse;
  return 'Warehouse(id: ${_this.id}, siteId: ${_this.siteId}, name: ${_this.name}, isActive: ${_this.isActive})';
}


}

/// @nodoc
abstract mixin class $WarehouseCopyWith<$Res>  {
  factory $WarehouseCopyWith(Warehouse value, $Res Function(Warehouse) _then) = _$WarehouseCopyWithImpl;
@useResult
$Res call({
 String id, String siteId, String name, bool isActive
});




}
/// @nodoc
class _$WarehouseCopyWithImpl<$Res>
    implements $WarehouseCopyWith<$Res> {
  _$WarehouseCopyWithImpl(this._self, this._then);

  final Warehouse _self;
  final $Res Function(Warehouse) _then;

/// Create a copy of Warehouse
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? siteId = null,Object? name = null,Object? isActive = null,}) {
  return _then(Warehouse(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,siteId: null == siteId ? _self.siteId : siteId // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [Warehouse].
extension WarehousePatterns on Warehouse {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Warehouse value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Warehouse() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Warehouse value)  $default,){
final _that = this;
switch (_that) {
case _Warehouse():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Warehouse value)?  $default,){
final _that = this;
switch (_that) {
case _Warehouse() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String siteId,  String name,  bool isActive)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Warehouse() when $default != null:
return $default(_that.id,_that.siteId,_that.name,_that.isActive);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String siteId,  String name,  bool isActive)  $default,) {final _that = this;
switch (_that) {
case _Warehouse():
return $default(_that.id,_that.siteId,_that.name,_that.isActive);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String siteId,  String name,  bool isActive)?  $default,) {final _that = this;
switch (_that) {
case _Warehouse() when $default != null:
return $default(_that.id,_that.siteId,_that.name,_that.isActive);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Warehouse implements Warehouse {
  const _Warehouse({required this.id, required this.siteId, required this.name, this.isActive = true});
  factory _Warehouse.fromJson(Map<String, dynamic> json) => _$WarehouseFromJson(json);

@override final  String id;
@override final  String siteId;
@override final  String name;
@override@JsonKey() final  bool isActive;

/// Create a copy of Warehouse
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$WarehouseCopyWith<_Warehouse> get copyWith => __$WarehouseCopyWithImpl<_Warehouse>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$WarehouseToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _Warehouse&&(identical(other.id, id) || other.id == id)&&(identical(other.siteId, siteId) || other.siteId == siteId)&&(identical(other.name, name) || other.name == name)&&(identical(other.isActive, isActive) || other.isActive == isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,siteId,name,isActive);
}

@override
String toString() {
    return 'Warehouse(id: $id, siteId: $siteId, name: $name, isActive: $isActive)';
}


}

/// @nodoc
abstract mixin class _$WarehouseCopyWith<$Res> implements $WarehouseCopyWith<$Res> {
  factory _$WarehouseCopyWith(_Warehouse value, $Res Function(_Warehouse) _then) = __$WarehouseCopyWithImpl;
@override @useResult
$Res call({
 String id, String siteId, String name, bool isActive
});




}
/// @nodoc
class __$WarehouseCopyWithImpl<$Res>
    implements _$WarehouseCopyWith<$Res> {
  __$WarehouseCopyWithImpl(this._self, this._then);

  final _Warehouse _self;
  final $Res Function(_Warehouse) _then;

/// Create a copy of Warehouse
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? siteId = null,Object? name = null,Object? isActive = null,}) {
  return _then(_Warehouse(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,siteId: null == siteId ? _self.siteId : siteId // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}


/// @nodoc
mixin _$LabourGroup {

 String get id; String get sardarPartyId; String get name; String get activity; String? get siteId; bool get isActive;
/// Create a copy of LabourGroup
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$LabourGroupCopyWith<LabourGroup> get copyWith => _$LabourGroupCopyWithImpl<LabourGroup>(this as LabourGroup, _$identity);

  /// Serializes this LabourGroup to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as LabourGroup;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is LabourGroup&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.sardarPartyId, _this.sardarPartyId) || other.sardarPartyId == _this.sardarPartyId)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.activity, _this.activity) || other.activity == _this.activity)&&(identical(other.siteId, _this.siteId) || other.siteId == _this.siteId)&&(identical(other.isActive, _this.isActive) || other.isActive == _this.isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as LabourGroup;
  return Object.hash(runtimeType,_this.id,_this.sardarPartyId,_this.name,_this.activity,_this.siteId,_this.isActive);
}

@override
String toString() {
  final _this = this as LabourGroup;
  return 'LabourGroup(id: ${_this.id}, sardarPartyId: ${_this.sardarPartyId}, name: ${_this.name}, activity: ${_this.activity}, siteId: ${_this.siteId}, isActive: ${_this.isActive})';
}


}

/// @nodoc
abstract mixin class $LabourGroupCopyWith<$Res>  {
  factory $LabourGroupCopyWith(LabourGroup value, $Res Function(LabourGroup) _then) = _$LabourGroupCopyWithImpl;
@useResult
$Res call({
 String id, String sardarPartyId, String name, String activity, String? siteId, bool isActive
});




}
/// @nodoc
class _$LabourGroupCopyWithImpl<$Res>
    implements $LabourGroupCopyWith<$Res> {
  _$LabourGroupCopyWithImpl(this._self, this._then);

  final LabourGroup _self;
  final $Res Function(LabourGroup) _then;

/// Create a copy of LabourGroup
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? sardarPartyId = null,Object? name = null,Object? activity = null,Object? siteId = freezed,Object? isActive = null,}) {
  return _then(LabourGroup(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,sardarPartyId: null == sardarPartyId ? _self.sardarPartyId : sardarPartyId // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,activity: null == activity ? _self.activity : activity // ignore: cast_nullable_to_non_nullable
as String,siteId: freezed == siteId ? _self.siteId : siteId // ignore: cast_nullable_to_non_nullable
as String?,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [LabourGroup].
extension LabourGroupPatterns on LabourGroup {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _LabourGroup value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _LabourGroup() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _LabourGroup value)  $default,){
final _that = this;
switch (_that) {
case _LabourGroup():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _LabourGroup value)?  $default,){
final _that = this;
switch (_that) {
case _LabourGroup() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String sardarPartyId,  String name,  String activity,  String? siteId,  bool isActive)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _LabourGroup() when $default != null:
return $default(_that.id,_that.sardarPartyId,_that.name,_that.activity,_that.siteId,_that.isActive);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String sardarPartyId,  String name,  String activity,  String? siteId,  bool isActive)  $default,) {final _that = this;
switch (_that) {
case _LabourGroup():
return $default(_that.id,_that.sardarPartyId,_that.name,_that.activity,_that.siteId,_that.isActive);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String sardarPartyId,  String name,  String activity,  String? siteId,  bool isActive)?  $default,) {final _that = this;
switch (_that) {
case _LabourGroup() when $default != null:
return $default(_that.id,_that.sardarPartyId,_that.name,_that.activity,_that.siteId,_that.isActive);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _LabourGroup implements LabourGroup {
  const _LabourGroup({required this.id, required this.sardarPartyId, required this.name, required this.activity, this.siteId, this.isActive = true});
  factory _LabourGroup.fromJson(Map<String, dynamic> json) => _$LabourGroupFromJson(json);

@override final  String id;
@override final  String sardarPartyId;
@override final  String name;
@override final  String activity;
@override final  String? siteId;
@override@JsonKey() final  bool isActive;

/// Create a copy of LabourGroup
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$LabourGroupCopyWith<_LabourGroup> get copyWith => __$LabourGroupCopyWithImpl<_LabourGroup>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$LabourGroupToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _LabourGroup&&(identical(other.id, id) || other.id == id)&&(identical(other.sardarPartyId, sardarPartyId) || other.sardarPartyId == sardarPartyId)&&(identical(other.name, name) || other.name == name)&&(identical(other.activity, activity) || other.activity == activity)&&(identical(other.siteId, siteId) || other.siteId == siteId)&&(identical(other.isActive, isActive) || other.isActive == isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,sardarPartyId,name,activity,siteId,isActive);
}

@override
String toString() {
    return 'LabourGroup(id: $id, sardarPartyId: $sardarPartyId, name: $name, activity: $activity, siteId: $siteId, isActive: $isActive)';
}


}

/// @nodoc
abstract mixin class _$LabourGroupCopyWith<$Res> implements $LabourGroupCopyWith<$Res> {
  factory _$LabourGroupCopyWith(_LabourGroup value, $Res Function(_LabourGroup) _then) = __$LabourGroupCopyWithImpl;
@override @useResult
$Res call({
 String id, String sardarPartyId, String name, String activity, String? siteId, bool isActive
});




}
/// @nodoc
class __$LabourGroupCopyWithImpl<$Res>
    implements _$LabourGroupCopyWith<$Res> {
  __$LabourGroupCopyWithImpl(this._self, this._then);

  final _LabourGroup _self;
  final $Res Function(_LabourGroup) _then;

/// Create a copy of LabourGroup
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? sardarPartyId = null,Object? name = null,Object? activity = null,Object? siteId = freezed,Object? isActive = null,}) {
  return _then(_LabourGroup(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,sardarPartyId: null == sardarPartyId ? _self.sardarPartyId : sardarPartyId // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,activity: null == activity ? _self.activity : activity // ignore: cast_nullable_to_non_nullable
as String,siteId: freezed == siteId ? _self.siteId : siteId // ignore: cast_nullable_to_non_nullable
as String?,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}


/// @nodoc
mixin _$Worker {

 String get id; String get labourGroupId; String get name; bool get isActive;
/// Create a copy of Worker
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$WorkerCopyWith<Worker> get copyWith => _$WorkerCopyWithImpl<Worker>(this as Worker, _$identity);

  /// Serializes this Worker to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as Worker;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Worker&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.labourGroupId, _this.labourGroupId) || other.labourGroupId == _this.labourGroupId)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.isActive, _this.isActive) || other.isActive == _this.isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as Worker;
  return Object.hash(runtimeType,_this.id,_this.labourGroupId,_this.name,_this.isActive);
}

@override
String toString() {
  final _this = this as Worker;
  return 'Worker(id: ${_this.id}, labourGroupId: ${_this.labourGroupId}, name: ${_this.name}, isActive: ${_this.isActive})';
}


}

/// @nodoc
abstract mixin class $WorkerCopyWith<$Res>  {
  factory $WorkerCopyWith(Worker value, $Res Function(Worker) _then) = _$WorkerCopyWithImpl;
@useResult
$Res call({
 String id, String labourGroupId, String name, bool isActive
});




}
/// @nodoc
class _$WorkerCopyWithImpl<$Res>
    implements $WorkerCopyWith<$Res> {
  _$WorkerCopyWithImpl(this._self, this._then);

  final Worker _self;
  final $Res Function(Worker) _then;

/// Create a copy of Worker
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? labourGroupId = null,Object? name = null,Object? isActive = null,}) {
  return _then(Worker(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,labourGroupId: null == labourGroupId ? _self.labourGroupId : labourGroupId // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [Worker].
extension WorkerPatterns on Worker {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Worker value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Worker() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Worker value)  $default,){
final _that = this;
switch (_that) {
case _Worker():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Worker value)?  $default,){
final _that = this;
switch (_that) {
case _Worker() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String labourGroupId,  String name,  bool isActive)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Worker() when $default != null:
return $default(_that.id,_that.labourGroupId,_that.name,_that.isActive);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String labourGroupId,  String name,  bool isActive)  $default,) {final _that = this;
switch (_that) {
case _Worker():
return $default(_that.id,_that.labourGroupId,_that.name,_that.isActive);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String labourGroupId,  String name,  bool isActive)?  $default,) {final _that = this;
switch (_that) {
case _Worker() when $default != null:
return $default(_that.id,_that.labourGroupId,_that.name,_that.isActive);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Worker implements Worker {
  const _Worker({required this.id, required this.labourGroupId, required this.name, this.isActive = true});
  factory _Worker.fromJson(Map<String, dynamic> json) => _$WorkerFromJson(json);

@override final  String id;
@override final  String labourGroupId;
@override final  String name;
@override@JsonKey() final  bool isActive;

/// Create a copy of Worker
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$WorkerCopyWith<_Worker> get copyWith => __$WorkerCopyWithImpl<_Worker>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$WorkerToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _Worker&&(identical(other.id, id) || other.id == id)&&(identical(other.labourGroupId, labourGroupId) || other.labourGroupId == labourGroupId)&&(identical(other.name, name) || other.name == name)&&(identical(other.isActive, isActive) || other.isActive == isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,labourGroupId,name,isActive);
}

@override
String toString() {
    return 'Worker(id: $id, labourGroupId: $labourGroupId, name: $name, isActive: $isActive)';
}


}

/// @nodoc
abstract mixin class _$WorkerCopyWith<$Res> implements $WorkerCopyWith<$Res> {
  factory _$WorkerCopyWith(_Worker value, $Res Function(_Worker) _then) = __$WorkerCopyWithImpl;
@override @useResult
$Res call({
 String id, String labourGroupId, String name, bool isActive
});




}
/// @nodoc
class __$WorkerCopyWithImpl<$Res>
    implements _$WorkerCopyWith<$Res> {
  __$WorkerCopyWithImpl(this._self, this._then);

  final _Worker _self;
  final $Res Function(_Worker) _then;

/// Create a copy of Worker
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? labourGroupId = null,Object? name = null,Object? isActive = null,}) {
  return _then(_Worker(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,labourGroupId: null == labourGroupId ? _self.labourGroupId : labourGroupId // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}


/// @nodoc
mixin _$Vehicle {

 String get id; String get registrationNo; bool get isActive;
/// Create a copy of Vehicle
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$VehicleCopyWith<Vehicle> get copyWith => _$VehicleCopyWithImpl<Vehicle>(this as Vehicle, _$identity);

  /// Serializes this Vehicle to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as Vehicle;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Vehicle&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.registrationNo, _this.registrationNo) || other.registrationNo == _this.registrationNo)&&(identical(other.isActive, _this.isActive) || other.isActive == _this.isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as Vehicle;
  return Object.hash(runtimeType,_this.id,_this.registrationNo,_this.isActive);
}

@override
String toString() {
  final _this = this as Vehicle;
  return 'Vehicle(id: ${_this.id}, registrationNo: ${_this.registrationNo}, isActive: ${_this.isActive})';
}


}

/// @nodoc
abstract mixin class $VehicleCopyWith<$Res>  {
  factory $VehicleCopyWith(Vehicle value, $Res Function(Vehicle) _then) = _$VehicleCopyWithImpl;
@useResult
$Res call({
 String id, String registrationNo, bool isActive
});




}
/// @nodoc
class _$VehicleCopyWithImpl<$Res>
    implements $VehicleCopyWith<$Res> {
  _$VehicleCopyWithImpl(this._self, this._then);

  final Vehicle _self;
  final $Res Function(Vehicle) _then;

/// Create a copy of Vehicle
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? registrationNo = null,Object? isActive = null,}) {
  return _then(Vehicle(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,registrationNo: null == registrationNo ? _self.registrationNo : registrationNo // ignore: cast_nullable_to_non_nullable
as String,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [Vehicle].
extension VehiclePatterns on Vehicle {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Vehicle value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Vehicle() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Vehicle value)  $default,){
final _that = this;
switch (_that) {
case _Vehicle():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Vehicle value)?  $default,){
final _that = this;
switch (_that) {
case _Vehicle() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String registrationNo,  bool isActive)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Vehicle() when $default != null:
return $default(_that.id,_that.registrationNo,_that.isActive);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String registrationNo,  bool isActive)  $default,) {final _that = this;
switch (_that) {
case _Vehicle():
return $default(_that.id,_that.registrationNo,_that.isActive);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String registrationNo,  bool isActive)?  $default,) {final _that = this;
switch (_that) {
case _Vehicle() when $default != null:
return $default(_that.id,_that.registrationNo,_that.isActive);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Vehicle implements Vehicle {
  const _Vehicle({required this.id, required this.registrationNo, this.isActive = true});
  factory _Vehicle.fromJson(Map<String, dynamic> json) => _$VehicleFromJson(json);

@override final  String id;
@override final  String registrationNo;
@override@JsonKey() final  bool isActive;

/// Create a copy of Vehicle
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$VehicleCopyWith<_Vehicle> get copyWith => __$VehicleCopyWithImpl<_Vehicle>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$VehicleToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _Vehicle&&(identical(other.id, id) || other.id == id)&&(identical(other.registrationNo, registrationNo) || other.registrationNo == registrationNo)&&(identical(other.isActive, isActive) || other.isActive == isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,registrationNo,isActive);
}

@override
String toString() {
    return 'Vehicle(id: $id, registrationNo: $registrationNo, isActive: $isActive)';
}


}

/// @nodoc
abstract mixin class _$VehicleCopyWith<$Res> implements $VehicleCopyWith<$Res> {
  factory _$VehicleCopyWith(_Vehicle value, $Res Function(_Vehicle) _then) = __$VehicleCopyWithImpl;
@override @useResult
$Res call({
 String id, String registrationNo, bool isActive
});




}
/// @nodoc
class __$VehicleCopyWithImpl<$Res>
    implements _$VehicleCopyWith<$Res> {
  __$VehicleCopyWithImpl(this._self, this._then);

  final _Vehicle _self;
  final $Res Function(_Vehicle) _then;

/// Create a copy of Vehicle
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? registrationNo = null,Object? isActive = null,}) {
  return _then(_Vehicle(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,registrationNo: null == registrationNo ? _self.registrationNo : registrationNo // ignore: cast_nullable_to_non_nullable
as String,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}


/// @nodoc
mixin _$Driver {

 String get id; String get name; bool get isActive;
/// Create a copy of Driver
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$DriverCopyWith<Driver> get copyWith => _$DriverCopyWithImpl<Driver>(this as Driver, _$identity);

  /// Serializes this Driver to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  final _this = this as Driver;
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Driver&&(identical(other.id, _this.id) || other.id == _this.id)&&(identical(other.name, _this.name) || other.name == _this.name)&&(identical(other.isActive, _this.isActive) || other.isActive == _this.isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
  final _this = this as Driver;
  return Object.hash(runtimeType,_this.id,_this.name,_this.isActive);
}

@override
String toString() {
  final _this = this as Driver;
  return 'Driver(id: ${_this.id}, name: ${_this.name}, isActive: ${_this.isActive})';
}


}

/// @nodoc
abstract mixin class $DriverCopyWith<$Res>  {
  factory $DriverCopyWith(Driver value, $Res Function(Driver) _then) = _$DriverCopyWithImpl;
@useResult
$Res call({
 String id, String name, bool isActive
});




}
/// @nodoc
class _$DriverCopyWithImpl<$Res>
    implements $DriverCopyWith<$Res> {
  _$DriverCopyWithImpl(this._self, this._then);

  final Driver _self;
  final $Res Function(Driver) _then;

/// Create a copy of Driver
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? isActive = null,}) {
  return _then(Driver(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}

}


/// Adds pattern-matching-related methods to [Driver].
extension DriverPatterns on Driver {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Driver value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Driver() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Driver value)  $default,){
final _that = this;
switch (_that) {
case _Driver():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Driver value)?  $default,){
final _that = this;
switch (_that) {
case _Driver() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  bool isActive)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Driver() when $default != null:
return $default(_that.id,_that.name,_that.isActive);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  bool isActive)  $default,) {final _that = this;
switch (_that) {
case _Driver():
return $default(_that.id,_that.name,_that.isActive);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  bool isActive)?  $default,) {final _that = this;
switch (_that) {
case _Driver() when $default != null:
return $default(_that.id,_that.name,_that.isActive);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Driver implements Driver {
  const _Driver({required this.id, required this.name, this.isActive = true});
  factory _Driver.fromJson(Map<String, dynamic> json) => _$DriverFromJson(json);

@override final  String id;
@override final  String name;
@override@JsonKey() final  bool isActive;

/// Create a copy of Driver
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$DriverCopyWith<_Driver> get copyWith => __$DriverCopyWithImpl<_Driver>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$DriverToJson(this, );
}

@override
bool operator ==(Object other) {
    return identical(this, other) || (other.runtimeType == runtimeType&&other is _Driver&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.isActive, isActive) || other.isActive == isActive));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode {
    return Object.hash(runtimeType,id,name,isActive);
}

@override
String toString() {
    return 'Driver(id: $id, name: $name, isActive: $isActive)';
}


}

/// @nodoc
abstract mixin class _$DriverCopyWith<$Res> implements $DriverCopyWith<$Res> {
  factory _$DriverCopyWith(_Driver value, $Res Function(_Driver) _then) = __$DriverCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, bool isActive
});




}
/// @nodoc
class __$DriverCopyWithImpl<$Res>
    implements _$DriverCopyWith<$Res> {
  __$DriverCopyWithImpl(this._self, this._then);

  final _Driver _self;
  final $Res Function(_Driver) _then;

/// Create a copy of Driver
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? isActive = null,}) {
  return _then(_Driver(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,isActive: null == isActive ? _self.isActive : isActive // ignore: cast_nullable_to_non_nullable
as bool,
  ));
}


}

// dart format on
