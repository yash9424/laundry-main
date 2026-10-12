/// Dates come off the API as ISO strings in UTC ("…T18:30:00.000Z").
///
/// `DateTime.parse` keeps them in UTC, and `.year`, `.month`, `.day` then
/// answer in UTC too -- so a slot at 18:30 UTC on the 5th reads as the 5th
/// here and as the 6th in the web app, which does its arithmetic with
/// JavaScript's `Date`, and that is always local. For India that is five and a
/// half hours, so anything booked after 18:30 shows the wrong day.
///
/// Everything in this app that parses a date goes through here.
DateTime? parseDate(Object? value) {
  final text = value?.toString();
  if (text == null || text.isEmpty) return null;
  return DateTime.tryParse(text)?.toLocal();
}
