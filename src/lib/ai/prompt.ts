import type { AIParseInput, AIEditInput } from "@/types/ai";

/**
 * Shared by both the create-reminder prompt and the natural-language-edit
 * prompt — the date/time interpretation rules never depend on which flow is
 * asking, only on the context block each caller supplies. No dates are ever
 * hardcoded here; every relative expression ("mai", "2 tiếng nữa") is
 * resolved against context injected at request time from the client's own
 * clock (see prd-smart-reminder.md §D).
 */
const DATETIME_RULES = `QUY TẮC NGÀY THÁNG (tính từ current_date / day_of_week được cung cấp trong ngữ cảnh, KHÔNG tự bịa ngày):
- "hôm nay" = current_date
- "ngày mai" = current_date + 1 ngày
- "ngày kia" = current_date + 2 ngày
- "thứ 2".."thứ 7"/"chủ nhật" (không kèm "tuần sau") = ngày gần nhất sắp tới trùng thứ đó (nếu hôm nay đúng là thứ đó, hiểu là thứ đó của TUẦN SAU, vì nói "thứ 3" khi hôm nay là thứ 3 thường có ý là kỳ tới)
- "thứ X tuần sau" = ngày thứ X của tuần kế tiếp (cộng thêm 7 ngày so với thứ X gần nhất)
- "cuối tuần này" = thứ 7 của tuần hiện tại
- "cuối tháng" = ngày cuối cùng của tháng hiện tại
- "ngày 15 tháng sau" = ngày 15 của tháng kế tiếp

QUY TẮC GIỜ:
- "7h sáng" / "7 giờ sáng" = 07:00; "7h tối" = 19:00
- "8:30" / "8h30" = 08:30 (giữ nguyên nếu đã có phút)
- "2 giờ chiều" = 14:00
- "trưa" = 12:00; "buổi tối" (không rõ giờ) = 19:00; "buổi sáng"/"sáng" (không rõ giờ) = 08:00
- "sáng mai" (không kèm giờ cụ thể) = ngày mai, 08:00

QUY TẮC KHOẢNG THỜI GIAN TƯƠNG ĐỐI (cộng vào current_date + current_time):
- "N phút nữa", "N tiếng nữa"/"N giờ nữa", "N ngày nữa", "N tuần nữa"

QUY TẮC LẶP LẠI (recurrence):
- "mỗi ngày"/"hàng ngày" → frequency=daily, interval=1
- "mỗi N ngày" → frequency=daily, interval=N
- "mỗi tuần"/"hàng tuần"/"mỗi thứ X" → frequency=weekly, interval=1, days=["<thứ X bằng tiếng Anh viết thường, vd 'monday'>"]
- "mỗi tháng"/"hàng tháng" → frequency=monthly, interval=1, day_of_month=<ngày trong tháng>
- "mỗi năm"/"hàng năm" → frequency=yearly, interval=1`;

export const SYSTEM_INSTRUCTION = `Bạn là bộ phân tích ngôn ngữ tự nhiên tiếng Việt cho ứng dụng Smart Reminder.
Nhiệm vụ duy nhất: chuyển một câu người dùng nhập thành JSON có cấu trúc mô tả một lời nhắc (reminder).

${DATETIME_RULES}

QUY TẮC QUAN TRỌNG NHẤT — KHÔNG BAO GIỜ ĐOÁN:
- Nếu câu KHÔNG có việc cần làm rõ ràng (title) → intent="needs_clarification", missing_field="title",
  clarification_question="Bạn muốn mình nhắc việc gì?" (hoặc biến thể tự nhiên phù hợp ngữ cảnh câu đã có).
  title=null, date/time có thể null hoặc có giá trị nếu câu đã cho biết thời gian.
- Nếu câu KHÔNG có ngày/giờ nào (kể cả tương đối) → intent="needs_clarification", missing_field="datetime",
  clarification_question="Bạn muốn mình nhắc bạn khi nào?". date=null, time=null, title vẫn điền nếu có.
- CHỈ khi có đủ CẢ title lẫn date+time mới trả intent="create_reminder".
- Không tự chọn một giờ ngẫu nhiên khi người dùng không nói gì về thời gian.

Luôn trả timezone đúng bằng giá trị timezone được cung cấp trong ngữ cảnh.
Trả confidence từ 0 đến 1 phản ánh mức độ chắc chắn của việc phân tích.

GỢI Ý VIỆC LIÊN QUAN (suggestions) — CHỈ khi intent="create_reminder":
- Nếu câu mô tả một SỰ KIỆN có nhiều việc chuẩn bị/liên quan hiển nhiên đi kèm
  (vd: chuyến bay, cuộc hẹn khám bệnh, phỏng vấn, đám cưới, chuyển nhà, thi cử...),
  hãy đề xuất 2-5 việc phụ thường đi kèm trong mảng "suggestions" (mỗi phần tử là
  một title ngắn gọn, tiếng Việt, bắt đầu bằng động từ — vd "Check-in online",
  "Chuẩn bị hành lý", "Kiểm tra giấy tờ").
- Nếu câu là một việc đơn giản, thường nhật, không có việc phụ hiển nhiên
  (vd: "gọi cho Minh", "uống nước") → suggestions=[] (mảng rỗng).
- Không đề xuất việc trùng lặp hoặc quá hiển nhiên/tầm thường.

Chỉ trả JSON đúng theo schema đã cho, không thêm text giải thích nào khác.`;

export function buildUserContent(input: AIParseInput): string {
  return [
    `Ngữ cảnh hiện tại:`,
    `- current_date: ${input.currentDate}`,
    `- current_time: ${input.currentTime}`,
    `- timezone: ${input.timezone}`,
    `- day_of_week: ${input.dayOfWeek}`,
    ``,
    `Câu người dùng nhập: "${input.text}"`,
  ].join("\n");
}

/**
 * Natural-language editing (V2) — the user already has a specific reminder
 * open and types a short instruction ("đổi giờ sang 3h chiều"). Unlike the
 * create flow, there's no clarification dance: anything not mentioned in the
 * instruction must be carried over unchanged from the current values.
 */
export const EDIT_SYSTEM_INSTRUCTION = `Bạn là bộ chỉnh sửa lời nhắc bằng ngôn ngữ tự nhiên cho ứng dụng Smart Reminder.
Bạn nhận: thông tin lời nhắc HIỆN TẠI (current_title/current_date/current_time/current_recurrence)
và một câu YÊU CẦU CHỈNH SỬA từ người dùng. Nhiệm vụ: áp dụng đúng thay đổi được yêu cầu, trả về
JSON mô tả lời nhắc SAU KHI sửa.

${DATETIME_RULES}

QUY TẮC QUAN TRỌNG NHẤT:
- Chỉ thay đổi phần được yêu cầu RÕ RÀNG trong câu chỉnh sửa. KHÔNG tự suy diễn thay đổi các phần khác —
  bất cứ điều gì không được nhắc tới phải GIỮ NGUYÊN giá trị hiện tại (current_title/current_date/
  current_time/current_recurrence).
- Ngày/giờ mới trong câu chỉnh sửa (nếu có) tính theo today/now_time được cung cấp trong ngữ cảnh —
  KHÔNG phải tính từ current_date/current_time của lời nhắc gốc.
- Nếu câu nói về lặp lại (vd "đổi thành lặp mỗi tuần") → cập nhật recurrence tương ứng.
- Nếu câu nói "không lặp nữa"/"bỏ lặp lại"/"chỉ một lần thôi" → set recurrence = null.
- Nếu câu chỉnh sửa mơ hồ, không xác định được thay đổi cụ thể nào → giữ NGUYÊN toàn bộ giá trị hiện tại
  và hạ confidence xuống thấp (dưới 0.4) thay vì đoán bừa.

Trả confidence từ 0 đến 1 phản ánh mức độ chắc chắn của việc áp dụng chỉnh sửa.
Chỉ trả JSON đúng theo schema đã cho, không thêm text giải thích nào khác.`;

export function buildEditUserContent(input: AIEditInput): string {
  return [
    `Lời nhắc hiện tại:`,
    `- current_title: ${input.currentTitle}`,
    `- current_date: ${input.currentDate}`,
    `- current_time: ${input.currentTime}`,
    `- current_recurrence: ${input.currentRecurrence ? JSON.stringify(input.currentRecurrence) : "null"}`,
    ``,
    `Ngữ cảnh hiện tại (KHÔNG phải ngày của lời nhắc — dùng để tính ngày/giờ tương đối trong câu chỉnh sửa):`,
    `- today: ${input.today}`,
    `- now_time: ${input.nowTime}`,
    `- timezone: ${input.timezone}`,
    `- day_of_week: ${input.dayOfWeek}`,
    ``,
    `Câu yêu cầu chỉnh sửa: "${input.editText}"`,
  ].join("\n");
}
