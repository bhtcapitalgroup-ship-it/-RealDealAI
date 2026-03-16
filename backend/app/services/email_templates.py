"""
RealDeal AI — HTML Email Templates

All templates use inline CSS for maximum email client compatibility.
Brand colors: Dark Blue (#1e3a5f), White, Light Gray (#f4f4f4).
Templates use .format() placeholders for dynamic content.
"""

# -------------------------------------------------------------------
# Shared components
# -------------------------------------------------------------------

_EMAIL_HEAD = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
"""

_EMAIL_HEADER_LOGO = """
<tr>
<td style="background-color:#1e3a5f;padding:24px 32px;text-align:center;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
  <tr>
    <td style="width:36px;height:36px;background-color:#3b82f6;border-radius:8px;text-align:center;vertical-align:middle;">
      <span style="color:#ffffff;font-weight:700;font-size:16px;line-height:36px;">RD</span>
    </td>
    <td style="padding-left:12px;">
      <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">RealDeal AI</span>
    </td>
  </tr>
  </table>
</td>
</tr>
"""

_EMAIL_FOOTER = """
<tr>
<td style="background-color:#f8f9fa;padding:24px 32px;text-align:center;border-top:1px solid #e5e7eb;">
  <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">
    RealDeal AI &mdash; Find your next investment deal.
  </p>
  <p style="margin:0;font-size:12px;color:#9ca3af;">
    <a href="{unsubscribe_url}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>
    &nbsp;&middot;&nbsp;
    <a href="{preferences_url}" style="color:#6b7280;text-decoration:underline;">Email Preferences</a>
    &nbsp;&middot;&nbsp;
    <a href="{base_url}" style="color:#6b7280;text-decoration:underline;">Visit Website</a>
  </p>
</td>
</tr>
"""

_EMAIL_TAIL = """
</table>
</td></tr>
</table>
</body>
</html>
"""

_CTA_BUTTON = """
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
<tr>
<td style="background-color:{btn_color};border-radius:8px;">
  <a href="{btn_url}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.3px;">{btn_text}</a>
</td>
</tr>
</table>
"""


# ===================================================================
# 1. DEAL ALERT TEMPLATE
# ===================================================================

DEAL_ALERT_TEMPLATE = (
    _EMAIL_HEAD.format(title="New Deal Alert - RealDeal AI")
    + _EMAIL_HEADER_LOGO
    + """
<tr>
<td style="padding:32px;">
  <!-- Headline -->
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">New Deal Match Found</h1>
  <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">A property matching your criteria just landed.</p>

  <!-- Property card -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
  <tr>
    <td style="background-color:#f0f4f8;padding:16px;text-align:center;">
      <!-- Photo placeholder -->
      <div style="width:100%;height:180px;background-color:#dbeafe;border-radius:8px;display:flex;align-items:center;justify-content:center;">
        <img src="{photo_url}" alt="Property" style="max-width:100%;max-height:180px;border-radius:8px;" />
      </div>
    </td>
  </tr>
  <tr>
    <td style="padding:20px;">
      <!-- Address & Price -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <p style="margin:0;font-size:17px;font-weight:700;color:#111827;">{address}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">{city_state_zip}</p>
        </td>
        <td style="text-align:right;vertical-align:top;">
          <!-- Score circle -->
          <div style="display:inline-block;width:48px;height:48px;border-radius:50%;background-color:{score_color};text-align:center;line-height:48px;">
            <span style="color:#ffffff;font-size:18px;font-weight:700;">{score}</span>
          </div>
        </td>
      </tr>
      </table>

      <p style="margin:12px 0 0;font-size:24px;font-weight:700;color:#1e3a5f;">{price}</p>

      <!-- Metrics grid -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:1px solid #e5e7eb;padding-top:16px;">
      <tr>
        <td style="width:25%;text-align:center;padding:8px 4px;">
          <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Cap Rate</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#059669;">{cap_rate}</p>
        </td>
        <td style="width:25%;text-align:center;padding:8px 4px;">
          <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Cash Flow</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#059669;">{cash_flow}</p>
        </td>
        <td style="width:25%;text-align:center;padding:8px 4px;">
          <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">ARV</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#1e3a5f;">{arv}</p>
        </td>
        <td style="width:25%;text-align:center;padding:8px 4px;">
          <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">DSCR</p>
          <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#1e3a5f;">{dscr}</p>
        </td>
      </tr>
      </table>

      <!-- AI Summary -->
      <div style="margin-top:16px;padding:14px;background-color:#f0f9ff;border-radius:8px;border-left:3px solid #3b82f6;">
        <p style="margin:0;font-size:13px;color:#374151;line-height:1.6;">{ai_summary}</p>
      </div>
    </td>
  </tr>
  </table>

  """
    + _CTA_BUTTON.format(
        btn_color="#1e3a5f", btn_url="{deal_url}", btn_text="View Deal"
    )
    + """
</td>
</tr>
"""
    + _EMAIL_FOOTER
    + _EMAIL_TAIL
)


# ===================================================================
# 2. WELCOME TEMPLATE
# ===================================================================

WELCOME_TEMPLATE = (
    _EMAIL_HEAD.format(title="Welcome to RealDeal AI")
    + _EMAIL_HEADER_LOGO
    + """
<tr>
<td style="padding:32px;">
  <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;">Welcome to RealDeal AI, {first_name}!</h1>
  <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
    You just took the first step toward smarter real estate investing. Here is how to get started:
  </p>

  <!-- Step 1 -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
  <tr>
    <td style="width:48px;vertical-align:top;">
      <div style="width:40px;height:40px;border-radius:50%;background-color:#dbeafe;text-align:center;line-height:40px;">
        <span style="color:#1e3a5f;font-size:18px;font-weight:700;">1</span>
      </div>
    </td>
    <td style="padding-left:12px;vertical-align:top;">
      <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">Explore Deals</p>
      <p style="margin:4px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">
        Browse thousands of investment properties scored by our AI. Filter by market, cap rate, cash flow, and more.
      </p>
    </td>
  </tr>
  </table>

  <!-- Step 2 -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
  <tr>
    <td style="width:48px;vertical-align:top;">
      <div style="width:40px;height:40px;border-radius:50%;background-color:#dbeafe;text-align:center;line-height:40px;">
        <span style="color:#1e3a5f;font-size:18px;font-weight:700;">2</span>
      </div>
    </td>
    <td style="padding-left:12px;vertical-align:top;">
      <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">Set Up Alerts</p>
      <p style="margin:4px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">
        Configure deal alerts so you never miss a property that matches your investment criteria.
      </p>
    </td>
  </tr>
  </table>

  <!-- Step 3 -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
  <tr>
    <td style="width:48px;vertical-align:top;">
      <div style="width:40px;height:40px;border-radius:50%;background-color:#dbeafe;text-align:center;line-height:40px;">
        <span style="color:#1e3a5f;font-size:18px;font-weight:700;">3</span>
      </div>
    </td>
    <td style="padding-left:12px;vertical-align:top;">
      <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">Analyze & Act</p>
      <p style="margin:4px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">
        Use our AI-powered analysis to evaluate each deal and make data-driven investment decisions.
      </p>
    </td>
  </tr>
  </table>

  """
    + _CTA_BUTTON.format(
        btn_color="#1e3a5f", btn_url="{dashboard_url}", btn_text="Explore Deals"
    )
    + """
</td>
</tr>
"""
    + _EMAIL_FOOTER
    + _EMAIL_TAIL
)


# ===================================================================
# 3. SUBSCRIPTION CONFIRMATION TEMPLATE
# ===================================================================

SUBSCRIPTION_CONFIRMATION_TEMPLATE = (
    _EMAIL_HEAD.format(title="Subscription Confirmed - RealDeal AI")
    + _EMAIL_HEADER_LOGO
    + """
<tr>
<td style="padding:32px;">
  <div style="text-align:center;margin-bottom:24px;">
    <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background-color:#d1fae5;text-align:center;line-height:56px;">
      <span style="font-size:28px;">&#10003;</span>
    </div>
  </div>

  <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;text-align:center;">
    Welcome to {plan_name}!
  </h1>
  <p style="margin:0 0 24px;font-size:15px;color:#6b7280;text-align:center;line-height:1.5;">
    Your subscription is now active. You will be billed <strong style="color:#111827;">{price}</strong> per {interval}.
  </p>

  <!-- Features unlocked -->
  <div style="background-color:#f0f9ff;border-radius:10px;padding:20px;margin-bottom:8px;">
    <p style="margin:0 0 14px;font-size:14px;font-weight:600;color:#1e3a5f;">Here is what you just unlocked:</p>
    {features_html}
  </div>

  """
    + _CTA_BUTTON.format(
        btn_color="#1e3a5f", btn_url="{dashboard_url}", btn_text="Go to Dashboard"
    )
    + """
</td>
</tr>
"""
    + _EMAIL_FOOTER
    + _EMAIL_TAIL
)


# ===================================================================
# 4. MARKET REPORT TEMPLATE (Weekly)
# ===================================================================

MARKET_REPORT_TEMPLATE = (
    _EMAIL_HEAD.format(title="Weekly Market Report - RealDeal AI")
    + _EMAIL_HEADER_LOGO
    + """
<tr>
<td style="padding:32px;">
  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Your Weekly Market Report</h1>
  <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Week of {week_date} &mdash; here is what happened in your markets.</p>

  <!-- Top 5 markets -->
  <h2 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#1e3a5f;">Top Markets This Week</h2>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
    <tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:8px 0;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;">#</td>
      <td style="padding:8px 0;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;">Market</td>
      <td style="padding:8px 0;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;text-align:right;">Score</td>
    </tr>
    {markets_rows_html}
  </table>

  <!-- Price/Rent trends -->
  <div style="background-color:#f8f9fa;border-radius:10px;padding:16px;margin-bottom:24px;">
    <h3 style="margin:0 0 8px;font-size:14px;font-weight:600;color:#111827;">Trend Highlights</h3>
    <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">{trend_summary}</p>
  </div>

  <!-- Best deals -->
  <h2 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#1e3a5f;">Best Deals This Week</h2>
  {best_deals_html}

  """
    + _CTA_BUTTON.format(
        btn_color="#1e3a5f", btn_url="{all_deals_url}", btn_text="See All Deals"
    )
    + """
</td>
</tr>
"""
    + _EMAIL_FOOTER
    + _EMAIL_TAIL
)


# ===================================================================
# 5. PAYMENT FAILED TEMPLATE
# ===================================================================

PAYMENT_FAILED_TEMPLATE = (
    _EMAIL_HEAD.format(title="Payment Failed - RealDeal AI")
    + _EMAIL_HEADER_LOGO
    + """
<tr>
<td style="padding:32px;">
  <!-- Warning icon -->
  <div style="text-align:center;margin-bottom:24px;">
    <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background-color:#fef3c7;text-align:center;line-height:56px;">
      <span style="font-size:28px;">&#9888;</span>
    </div>
  </div>

  <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#dc2626;text-align:center;">
    Payment Failed
  </h1>
  <p style="margin:0 0 24px;font-size:15px;color:#6b7280;text-align:center;line-height:1.5;">
    We were unable to process your payment of <strong style="color:#111827;">{amount}</strong> for your {plan_name} subscription.
  </p>

  <!-- What happened -->
  <div style="background-color:#fef2f2;border-radius:10px;padding:16px;border-left:3px solid #ef4444;margin-bottom:24px;">
    <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#991b1b;">What happened</p>
    <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">
      {failure_reason}
    </p>
  </div>

  <!-- Grace period notice -->
  <div style="background-color:#fffbeb;border-radius:10px;padding:16px;margin-bottom:8px;">
    <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">
      <strong>Grace period:</strong> You have <strong>{grace_days} days</strong> to update your payment method.
      After that, your account will be downgraded to the Free plan and you will lose access to premium features.
    </p>
  </div>

  """
    + _CTA_BUTTON.format(
        btn_color="#dc2626",
        btn_url="{update_payment_url}",
        btn_text="Update Payment Method",
    )
    + """

  <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;text-align:center;">
    Questions? Reply to this email or reach out to <a href="mailto:support@realdeal.ai" style="color:#3b82f6;text-decoration:none;">support@realdeal.ai</a>.
  </p>
</td>
</tr>
"""
    + _EMAIL_FOOTER
    + _EMAIL_TAIL
)


# -------------------------------------------------------------------
# Helper: generate feature list HTML for subscription confirmation
# -------------------------------------------------------------------


def build_features_html(features: list[str]) -> str:
    """Return an HTML string with checkmark list items for the subscription email."""
    rows = []
    for feat in features:
        rows.append(
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">'
            "<tr>"
            '<td style="width:24px;vertical-align:top;">'
            '<span style="color:#059669;font-size:16px;font-weight:700;">&#10003;</span>'
            "</td>"
            '<td style="padding-left:8px;">'
            f'<span style="font-size:13px;color:#374151;">{feat}</span>'
            "</td>"
            "</tr></table>"
        )
    return "\n".join(rows)


def build_market_rows_html(markets: list[dict]) -> str:
    """
    Build HTML rows for the weekly market report.
    Each market dict: {"rank": 1, "name": "Austin, TX", "score": 87}
    """
    rows = []
    for m in markets:
        score_color = (
            "#059669"
            if m["score"] >= 70
            else "#d97706"
            if m["score"] >= 50
            else "#dc2626"
        )
        rows.append(
            f'<tr style="border-bottom:1px solid #f3f4f6;">'
            f'<td style="padding:10px 0;font-size:14px;color:#9ca3af;font-weight:600;">{m["rank"]}</td>'
            f'<td style="padding:10px 0;font-size:14px;color:#111827;font-weight:500;">{m["name"]}</td>'
            f'<td style="padding:10px 0;text-align:right;">'
            f'<span style="display:inline-block;min-width:32px;padding:2px 8px;border-radius:12px;'
            f"background-color:{score_color};color:#ffffff;font-size:13px;font-weight:700;text-align:center;"
            f'">{m["score"]}</span>'
            f"</td></tr>"
        )
    return "\n".join(rows)


def build_best_deals_html(deals: list[dict]) -> str:
    """
    Build HTML cards for best deals in the market report.
    Each deal dict: {"address": "...", "price": "$...", "score": 92, "cap_rate": "8.2%"}
    """
    cards = []
    for d in deals:
        score_color = (
            "#059669"
            if d["score"] >= 70
            else "#d97706"
            if d["score"] >= 50
            else "#dc2626"
        )
        cards.append(
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"'
            ' style="margin-bottom:12px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">'
            "<tr>"
            '<td style="padding:14px;">'
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
            "<td>"
            f'<p style="margin:0;font-size:14px;font-weight:600;color:#111827;">{d["address"]}</p>'
            f'<p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#1e3a5f;">{d["price"]}</p>'
            f'<p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Cap Rate: {d["cap_rate"]}</p>'
            "</td>"
            '<td style="text-align:right;vertical-align:top;">'
            f'<div style="display:inline-block;width:40px;height:40px;border-radius:50%;'
            f"background-color:{score_color};text-align:center;line-height:40px;"
            f'">'
            f'<span style="color:#ffffff;font-size:16px;font-weight:700;">{d["score"]}</span>'
            "</div></td>"
            "</tr></table>"
            "</td></tr></table>"
        )
    return "\n".join(cards)
