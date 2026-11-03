// Vercel supplies the country header; no raw IP address is read or retained.
module.exports = function locale(req, res) {
  const country = String(req.headers["x-vercel-ip-country"] || "").toUpperCase();
  const language = country ? (country === "TH" ? "th" : "en")
    : (/^th\b/i.test(req.headers["accept-language"] || "") ? "th" : "en");
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.status(200).json({ locale: language });
};
