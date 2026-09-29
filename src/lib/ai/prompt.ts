import type { AIParseInput, AIEditInput, AIImageParseInput } from "@/types/ai";

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

/** Shared by both the text-input and image-scan prompts — identical suggestion policy either way. */
const SUGGESTIONS_RULES = `GỢI Ý VIỆC LIÊN QUAN (suggestions) — CHỈ khi intent="create_reminder":
- Nếu nội dung mô tả một SỰ KIỆN có nhiều việc chuẩn bị/liên quan hiển nhiên đi kèm
  (vd: chuyến bay, cuộc hẹn khám bệnh, phỏng vấn, đám cưới, chuyển nhà, thi cử, hóa đơn cần thanh toán...),
  hãy đề xuất 2-5 việc phụ thường đi kèm trong mảng "suggestions" (mỗi phần tử là
  một title ngắn gọn, tiếng Việt, bắt đầu bằng động từ — vd "Check-in online",
  "Chuẩn bị hành lý", "Kiểm tra giấy tờ").
- Nếu là một việc đơn giản, thường nhật, không có việc phụ hiển nhiên
  (vd: "gọi cho Minh", "uống nước") → suggestions=[] (mảng rỗng).
- Không đề xuất việc trùng lặp hoặc quá hiển nhiên/tầm thường.`;

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

${SUGGESTIONS_RULES}

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

/**
 * Scan ảnh (V2) — image → Gemini Vision → same output contract as the text
 * parser (SYSTEM_INSTRUCTION above), so the client's preview/clarification/
 * confirm flow is 100% shared across text, voice, and image input.
 */
export const IMAGE_SYSTEM_INSTRUCTION = `Bạn là bộ phân tích hình ảnh cho ứng dụng Smart Reminder.
Nhiệm vụ: xem ảnh đính kèm (ảnh chụp giấy ghi chú, hóa đơn, vé máy bay, vé sự kiện, poster, lịch,
tin nhắn, email, tài liệu, screenshot, hoặc bất kỳ ảnh nào có chứa ngày/giờ/deadline/việc cần nhớ),
HIỂU NGỮ CẢNH thật sự của nội dung trong ảnh (không chỉ OCR chép lại chữ), rồi chuyển thành JSON
có cấu trúc mô tả một lời nhắc (reminder) — đúng theo schema và quy tắc như khi phân tích một câu văn bản.

${DATETIME_RULES}

QUY TẮC QUAN TRỌNG NHẤT — KHÔNG BAO GIỜ ĐOÁN:
- Nếu ảnh không có việc/nội dung cần nhớ rõ ràng → intent="needs_clarification", missing_field="title",
  clarification_question="Mình chưa tìm thấy thông tin cần nhắc trong ảnh, bạn có thể mô tả thêm không?".
- Nếu ảnh có việc cần làm nhưng KHÔNG xác định được ngày/giờ cụ thể (kể cả tương đối) →
  intent="needs_clarification", missing_field="datetime", clarification_question hỏi cụ thể ngày/giờ nào
  (vd: "Bạn muốn đặt lời nhắc vào Thứ Sáu, 02/10 lúc mấy giờ?" — nêu rõ ngày mình suy luận được nếu có).
- Nếu ảnh có NHIỀU ngày/giờ hoặc nhiều mốc thời gian khác nhau và không rõ mốc nào là chính →
  intent="needs_clarification", missing_field="datetime", clarification_question liệt kê ngắn gọn các lựa
  chọn để người dùng xác nhận mốc nào đúng.
- CHỈ khi có đủ CẢ title lẫn date+time rõ ràng, không mơ hồ mới trả intent="create_reminder".
- Không tự chọn một giờ ngẫu nhiên khi ảnh không cho biết thời gian.
- Nếu ảnh mờ, không đọc được chữ, hoặc hoàn toàn không liên quan đến việc cần nhớ → vẫn trả về
  needs_clarification với clarification_question="Mình chưa đọc rõ nội dung trong ảnh, bạn có thể chụp
  lại rõ hơn hoặc mô tả thêm không?" — KHÔNG được bịa ra một reminder không có căn cứ trong ảnh.

Nếu ảnh có thông tin phụ hữu ích không thuộc title/date/time (vd: số tiền hóa đơn, địa điểm, mã vé),
hãy đưa vào "description" ngắn gọn.

Luôn trả timezone đúng bằng giá trị timezone được cung cấp trong ngữ cảnh.
Trả confidence từ 0 đến 1 phản ánh mức độ chắc chắn — hạ thấp confidence khi ảnh khó đọc hoặc phải suy luận nhiều.

${SUGGESTIONS_RULES}

Chỉ trả JSON đúng theo schema đã cho, không thêm text giải thích nào khác.`;

export function buildImageUserContent(input: AIImageParseInput): string {
  const lines = [
    `Ngữ cảnh hiện tại:`,
    `- current_date: ${input.currentDate}`,
    `- current_time: ${input.currentTime}`,
    `- timezone: ${input.timezone}`,
    `- day_of_week: ${input.dayOfWeek}`,
  ];
  if (input.additionalContext?.trim()) {
    lines.push(
      ``,
      `Đây là lượt phân tích lại CÙNG một ảnh sau khi đã hỏi thêm người dùng — dưới đây là các câu hỏi/`,
      `trả lời bổ sung, kết hợp với nội dung ảnh để đưa ra kết quả chính xác hơn:`,
      `"${input.additionalContext.trim()}"`
    );
  }
  lines.push(``, `Hãy phân tích ảnh đính kèm theo ngữ cảnh trên.`);
  return lines.join("\n");
}
