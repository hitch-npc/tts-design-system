#!/usr/bin/env python3
"""Генератор писем-рассылок Ticket to Show на DS R14 (тёмная тема).

Запуск из корня репозитория: npm run build:emails  (или python3 tooling/build-emails.py)
Результат — самодостаточные HTML в emails/mailings/: after-show, reschedule, reminder, promo, personal.
Готовые HTML руками не править: меняешь шапку, футер, кнопку или текст здесь и пересобираешь.

Разметка — как у писем до редизайна: таблицы, цвета зафиксированы градиентом (тёмный режим
почтовиков их не перекрашивает), картинки с tickettoshow.ru. Цвета — hex из tokens.json (тёмная тема):
почтовики не понимают var(--…), поэтому токены продублированы ниже.
"""
import os
import re

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'emails', 'mailings')
IMG = 'https://tickettoshow.ru'

# ── Токены R14, тёмная тема (tokens.json) ──
INK = '#0D0D0D'
FOOT = '#080808'   # футер темнее страницы (решение 20)
N950 = '#111318'
N900 = '#191C22'
N850 = '#1F222A'
N800 = '#262930'
N700 = '#4A4A48'
N600 = '#626260'
N500 = '#7A7A78'
N400 = '#8A8A88'
N300 = '#A6A6A2'
N200 = '#C0C0BC'
N100 = '#D6D6D2'
ACC = '#0047FF'
ACC_GHOST = '#0B142A'
WHITE = '#FFFFFF'
DANGER_BG = '#2D1010'
DANGER_BD = '#7A2020'
FAINT = '#08133D'
TAGS = {
    'red': ('#220A0A', '#F87171', '#441414'),
    'green': ('#0A2210', '#4ADE80', '#1A4428'),
    'orange': ('#221408', '#FB923C', '#442810'),
    'default': (N900, N300, N800),
}
BLOB = {  # blob = жанр
    'cool': ('#06277F', '#15092A'),
    'warm': ('#4A1F00', '#2A1200'),
    'green': ('#0A2A0A', '#051205'),
    'purple': ('#200840', '#15092A'),
}

SANS = "'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif"
DISP = "'Cormorant Garamond',Georgia,'Times New Roman',serif"   # только от 22px
HEAD = "'Forum',Georgia,'Times New Roman',serif"                # названия мельче 22px
NUM = "'Oranienbaum',Georgia,'Times New Roman',serif"           # числа: даты, цены

FONTS = ('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500'
         '&family=Forum&family=Oranienbaum&family=Manrope:wght@400;500;600;700&display=swap')


# ── Примитивы ──
def tc(c):
    """Цвет текста, который не перекрашивает тёмный режим почтовика."""
    return f'background-image:linear-gradient({c},{c});-webkit-background-clip:text;background-clip:text;color:transparent;'


def bg(c):
    return f'background-color:{c};background-image:linear-gradient({c},{c});'


def card(b, bd):
    """Фон + рамка, зафиксированные градиентами; радиус системы 2px."""
    return (f'border:1px solid transparent;border-radius:2px;background-color:{b};'
            f'background-image:linear-gradient({b},{b}),linear-gradient({bd},{bd});'
            f'background-origin:border-box;background-clip:padding-box,border-box;')


def blob(kind):
    core, mid = BLOB[kind]
    return (f'background-color:{N900};'
            f'background-image:radial-gradient(circle at 82% 92%,{core} 0%,{mid} 38%,rgba(25,28,34,0) 72%),'
            f'radial-gradient(circle at 6% 0%,{FAINT} 0%,rgba(25,28,34,0) 48%),linear-gradient({N900},{N900});')


def ty(s):
    """Неразрывные пробелы: перед тире, после предлогов, между числом и словом."""
    s = s.replace(' — ', '&nbsp;— ')
    s = re.sub(r'(?<![А-Яа-яЁёA-Za-z0-9&;])([А-Яа-яЁёA-Za-z]{1,2}) ', r'\1&nbsp;', s)
    s = re.sub(r'(\d) (?=[А-Яа-яЁё₽%])', r'\1&nbsp;', s)
    return s


def cl(c):
    return f' class="{c}"' if c else ''


def tbl(inner, width='100%', style='', cls=None, align=None, bgc=None):
    w = f'width:{width}px;' if width not in ('100%', 'auto') else ''
    wa = f' width="{width}"' if width != 'auto' else ''
    a = f' align="{align}"' if align else ''
    b = f' bgcolor="{bgc}"' if bgc else ''
    return (f'<table{cl(cls)} role="presentation"{wa} cellpadding="0" cellspacing="0" border="0"{a}{b}'
            f' style="{w}{style}">{inner}</table>')


def T(text, size, lh, color, weight=400, font=SANS, ls=None, upper=False, mb=0, align=None,
      cls=None, tag='p', extra=''):
    st = f'margin:0 0 {mb}px 0;font-family:{font};font-size:{size}px;font-weight:{weight};line-height:{lh}px;'
    if ls:
        st += f'letter-spacing:{ls};'
    if upper:
        st += 'text-transform:uppercase;'
    if align:
        st += f'text-align:{align};'
    st += extra + tc(color)
    return f'<{tag}{cl(cls)} style="{st}">{text}</{tag}>'


def S(text, color, extra=''):
    return f'<span style="{extra}{tc(color)}">{text}</span>'


def caption(text, mb=12, color=N500, align=None):
    """Серая подпись капсом — один стиль (решение 5): 10px / 500 / .14em."""
    return T(text, 10, 14, color, 500, ls='.14em', upper=True, mb=mb, align=align)


def eyebrow(text, mb=0, tag='p'):
    """Надзаголовок строкой (решение 4): 10px / 600 / .22em / n300."""
    return T(text, 10, 14, N300, 600, ls='.22em', upper=True, mb=mb, tag=tag)


def link(text, href='#', color=N100, line=ACC):
    return (f'<a href="{href}" target="_blank" style="text-decoration:none;border-bottom:1px solid {line};'
            f'{tc(color)}">{text}</a>')


def tag(text, kind, align=None):
    b, f, bd = TAGS[kind]
    inner = T(text, 10, 14, f, 600, ls='.16em', upper=True, tag='span', extra='display:block;white-space:nowrap;')
    return tbl(f'<tr><td style="padding:4px 10px;{card(b, bd)}">{inner}</td></tr>', width='auto', align=align)


def button(text, href='#', kind='primary', size='lg'):
    """Кнопки R14: капс, .16em; заливная 700 (всегда кобальт), контурные 600 со светлым текстом."""
    fs, lh = (12, 14) if size == 'lg' else (11, 14)
    if kind == 'primary':
        cell = f' bgcolor="{ACC}" style="border-radius:2px;{bg(ACC)}"'
        color, weight, pad = WHITE, 700, ('17px 24px' if size == 'lg' else '13px 20px')
    else:
        border = ACC if kind == 'ghost-accent' else N700
        cell = f' bgcolor="{INK}" style="{card(INK, border)}"'
        color, weight, pad = N100, 600, ('16px 24px' if size == 'lg' else '12px 20px')
    a = (f'<a href="{href}" target="_blank" style="display:block;padding:{pad};font-family:{SANS};font-size:{fs}px;'
         f'font-weight:{weight};line-height:{lh}px;letter-spacing:.16em;text-transform:uppercase;text-align:center;'
         f'text-decoration:none;white-space:nowrap;">{S(text, color)}</a>')
    return tbl(f'<tr><td align="center"{cell}>{a}</td></tr>')


def line(color=N850):
    return f'<div style="height:1px;line-height:1px;font-size:0;{bg(color)}">&nbsp;</div>'


def row(inner, pad='0 32px', cls='pad', tr=''):
    return f'\n  <tr{tr}>\n    <td{cl(cls)} style="padding:{pad};">\n{inner}\n    </td>\n  </tr>'


def comment(text):
    return f'\n\n  <!-- ═══ {text} ═══ -->'


# ── Общие блоки ──
def header(label):
    logo = (f'<img class="logo" src="{IMG}/logo-post.png" alt="Ticket to Show" width="128" height="32"'
            f' style="display:block;width:128px;height:32px;border:0;">')
    inner = tbl(f'<tr><td valign="middle" style="vertical-align:middle;">{logo}</td>'
                f'<td align="right" valign="middle" style="vertical-align:middle;">{label}</td></tr>')
    return (comment('ШАПКА') + row(inner, '28px 32px 24px', 'pad hdr')
            + row(line(), '0 32px'))


def hero(title, lead=None, over=None, pre='', post=''):
    parts = [pre]
    if over:
        parts.append(eyebrow(over, mb=16))
    parts.append(T(title, 40, 44, N100, 500, font=DISP, tag='h1', cls='h1'))
    if lead:
        parts.append(T(lead, 15, 26, N300, mb=0, cls='lead', extra='margin-top:16px;'))
    parts.append(post)
    return comment('ЗАГОЛОВОК') + row(''.join(parts), '48px 32px 0', 'pad hero')


def event_h(title, meta, kind, size=56, cls_thumb=''):
    thumb = tbl(f'<tr><td class="{cls_thumb}" width="{size}" height="{size}" style="width:{size}px;height:{size}px;'
                f'font-size:0;line-height:0;border-radius:2px;{blob(kind)}">&nbsp;</td></tr>', width=str(size))
    return tbl(
        f'<tr>'
        f'<td width="{size}" valign="middle" style="width:{size}px;padding:16px;vertical-align:middle;">'
        f'<!-- обложка события: в проде <img> {size}×{size} -->{thumb}</td>'
        f'<td valign="middle" style="vertical-align:middle;padding:16px 20px 16px 0;">'
        f'{T(ty(title), 19, 24, N100, font=HEAD, mb=4, cls="ev-title")}'
        f'{T(meta, 12, 18, N500)}</td></tr>',
        style=card(N950, N800), bgc=N950)


SOCIALS = [('tg-post.png', 'Telegram', 18, 13), ('tt-post.png', 'TikTok', 18, 18), ('yt-post.png', 'YouTube', 18, 18)]


def footer(extra_link=None, unsub='Отписаться'):
    """Футер R14: темнее страницы, сверху кобальтовая линия с растворением."""
    icons = ''.join(
        f'<td style="padding-right:8px;"><a href="#" target="_blank" style="display:block;text-decoration:none;">'
        + tbl(f'<tr><td width="36" height="36" align="center" valign="middle" style="width:36px;height:36px;'
              f'text-align:center;vertical-align:middle;{card(N950, N850)}">'
              f'<img src="{IMG}/{f}" alt="{alt}" width="{w}" height="{h}" style="display:inline-block;'
              f'vertical-align:middle;width:{w}px;height:{h}px;border:0;"></td></tr>', width='36')
        + '</a></td>'
        for f, alt, w, h in SOCIALS)
    team = T('С&nbsp;уважением, команда ' + S('Ticket&nbsp;to&nbsp;Show', N100), 13, 20, N400,
             mb=(10 if extra_link else 0))
    ref = T(link(extra_link, color=N300, line=N700), 13, 20, N300) if extra_link else ''
    copy = T('©&nbsp;2026 Ticket To&nbsp;Show&nbsp;&nbsp;·&nbsp;&nbsp;' + link(unsub, color=N500, line=N700),
             11, 16, N600)
    inner = (
        f'\n      <!-- линия кобальтом с растворением -->'
        f'\n      <div style="height:1px;line-height:1px;font-size:0;background-color:{N850};'
        f'background-image:linear-gradient(90deg,{ACC} 0%,rgba(0,71,255,0) 55%);">&nbsp;</div>'
        f'\n      ' + tbl(
            row(team + ref, '32px 32px 0', 'pad foot')
            + row(tbl(f'<tr>{icons}</tr>', width='auto'), '20px 32px 24px')
            + row(line(), '0 32px')
            + row(copy, '18px 32px 32px'),
            style='width:100%;max-width:600px;', cls='ew', align='center'))
    return (comment('ФУТЕР (на всю ширину, темнее страницы)')
            + f'\n<tr>\n  <td bgcolor="{FOOT}" style="{bg(FOOT)}">{inner}\n  </td>\n</tr>')


BASE_CSS = """
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
    a { text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #0D0D0D;
           -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    @media only screen and (max-width: 600px) {
      .ew { width: 100% !important; max-width: 100% !important; }
      .pad { padding-left: 20px !important; padding-right: 20px !important; }
      .hdr { padding-top: 20px !important; padding-bottom: 18px !important; }
      .logo { width: 112px !important; height: 28px !important; }
      .hero { padding-top: 36px !important; }
      .h1 { font-size: 30px !important; line-height: 34px !important; }
      .lead { font-size: 14px !important; line-height: 22px !important; }
      .sec { padding-top: 28px !important; }
      .end { padding-bottom: 40px !important; }
      .foot { padding-top: 28px !important; }
      .card-pad { padding: 20px !important; }
      .ev-title { font-size: 17px !important; line-height: 22px !important; }
      .hide-mob { display: none !important; }
      .show-mob { display: table-row !important; }
      .col { display: block !important; width: 100% !important; box-sizing: border-box !important; }
      .col-l { padding: 0 0 12px 0 !important; }
      .col-r { padding: 0 0 12px 0 !important; }%EXTRA%
    }
"""


def page(title, label, body, foot, extra_css=''):
    css = BASE_CSS.replace('%EXTRA%', extra_css)
    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>{title}</title>
  <link href="{FONTS}" rel="stylesheet">
  <style>{css}  </style>
</head>
<body bgcolor="{INK}" style="margin:0;padding:0;{bg(INK)}">

<!-- Ticket to Show · письмо на DS R14 (тёмная тема) -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{INK}" style="{bg(INK)}">
<tr>
  <td align="center" bgcolor="{INK}" style="{bg(INK)}">

<!-- ══════════════ WRAPPER 600px ══════════════ -->
<table class="ew" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="{INK}"
       style="width:100%;max-width:600px;{bg(INK)}">
{header(label)}{body}

</table>
<!-- ══════════════ /WRAPPER ══════════════ -->

  </td>
</tr>{foot}
</table>

</body>
</html>
"""


# ════════════════════════════════════════════════════════════════════
# 1. ПИСЬМО ПОСЛЕ СПЕКТАКЛЯ (новое, строго по ТЗ)
# ════════════════════════════════════════════════════════════════════
def after_show():
    review = (T(ty('Если будет желание — можно поделиться впечатлением на Яндексе, нам это важно.'),
                15, 26, N300, cls='lead', mb=28, extra='margin-top:16px;')
              + '\n      <!-- ссылка на отзыв в Яндексе -->\n      ' + button('Поделиться впечатлением'))
    body = hero('Надеемся, вам понравилось мероприятие', post=review)

    body += comment('ЕЩЁ СОБЫТИЯ')
    body += row(line(), '40px 32px 0', 'pad sec')
    body += row(T(ty('Если захотите продолжить — можем порекомендовать ещё несколько событий в похожем формате.'),
                  15, 26, N300, cls='lead'), '32px 32px 0', 'pad sec')

    items = ['публикуем только лучшие события Москвы',
             'даём ранний доступ к покупке билетов',
             'иногда делаем персональные условия и пригласительные']
    lst = tbl(''.join(
        f'<tr><td width="22" valign="top" style="width:22px;padding:5px 0;vertical-align:top;">'
        f'{T("—", 14, 22, N600)}</td>'
        f'<td valign="top" style="padding:5px 0;vertical-align:top;">{T(ty(t), 14, 22, N200)}</td></tr>'
        for t in items))
    icon = tbl(f'<tr><td width="40" height="40" align="center" valign="middle" style="width:40px;height:40px;'
               f'text-align:center;vertical-align:middle;{card(N900, N850)}">'
               f'<img src="{IMG}/tg-post.png" alt="" width="18" height="13" style="display:inline-block;'
               f'vertical-align:middle;width:18px;height:13px;border:0;"></td></tr>', width='40')
    tg = tbl(
        f'<tr><td class="card-pad" style="padding:28px;">'
        + tbl(f'<tr><td width="40" valign="middle" style="width:40px;vertical-align:middle;">{icon}</td>'
              f'<td valign="middle" style="vertical-align:middle;padding-left:16px;">'
              f'{T(ty("Также для клиентов у нас есть ") + S("Telegram-канал,", N100, "white-space:nowrap;") + " где&nbsp;мы:", 15, 22, N100, 500)}</td></tr>')
        + f'<div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>{lst}'
        + '<div style="height:24px;line-height:24px;font-size:0;">&nbsp;</div>'
        + '<!-- ссылка на Telegram-канал -->' + button('Присоединиться', kind='ghost-accent')
        + '</td></tr>',
        style=card(N950, N800), bgc=N950)
    body += comment('TELEGRAM-КАНАЛ') + row(tg, '24px 32px 0')

    body += comment('ПОДБОР ПО ВКУСУ')
    body += row(T(ty('Если хотите, можем подобрать мероприятия под ваш вкус — ') + S('просто напишите.', N100),
                  15, 26, N300, cls='lead'), '32px 32px 56px', 'pad sec end')
    return page('Надеемся, вам понравилось мероприятие — Ticket to Show', eyebrow('Спасибо', tag='span'),
                body, footer())


# ════════════════════════════════════════════════════════════════════
# 2. ПЕРЕНОС ДАТЫ
# ════════════════════════════════════════════════════════════════════
def reschedule():
    warn = tbl(f'<tr><td width="44" height="44" align="center" valign="middle" style="width:44px;height:44px;'
               f'text-align:center;vertical-align:middle;{card(DANGER_BG, DANGER_BD)}">'
               f'{T("!", 22, 24, TAGS["red"][1], 700, align="center")}</td></tr>', width='44')
    body = hero('Дата мероприятия изменилась',
                ty('Организаторы перенесли событие. Ваши билеты действительны. Если новая дата не подходит — оформите возврат.'),
                pre=warn + '<div style="height:20px;line-height:20px;font-size:0;">&nbsp;</div>')

    body += comment('СОБЫТИЕ') + row(
        event_h('Спиваков и Герзмава', 'Дом музыки&nbsp;&nbsp;·&nbsp;&nbsp;Партер, ряд&nbsp;6, места 11–12', 'cool'),
        '32px 32px 0', 'pad sec')

    def date_card(label, date, sub, active):
        b, bd = (ACC_GHOST, ACC) if active else (N950, N800)
        num, subc, lab = (N100, N300, N300) if active else (N600, N600, N500)
        return tbl(f'<tr><td class="date-pad" style="padding:18px 20px;">'
                   f'{caption(label, mb=8, color=lab)}'
                   f'{T(date, 28, 32, num, font=NUM, cls="num-lg", mb=4)}'
                   f'{T(sub, 12, 18, subc, cls="date-sub")}</td></tr>',
                   style=card(b, bd), bgc=b)
    dates = tbl(
        '<tr>'
        f'<td width="47%" valign="top" style="width:47%;vertical-align:top;">'
        f'{date_card("Было", "18&nbsp;мая", "19:00&nbsp;·&nbsp;отменено", False)}</td>'
        f'<td class="arrow" width="6%" align="center" valign="middle" style="width:6%;text-align:center;vertical-align:middle;">'
        f'{T("→", 16, 20, N600, align="center")}</td>'
        f'<td width="47%" valign="top" style="width:47%;vertical-align:top;">'
        f'{date_card("Стало", "15&nbsp;июня", "19:00&nbsp;·&nbsp;те&nbsp;же места", True)}</td>'
        '</tr>')
    body += comment('БЫЛО → СТАЛО') + row(dates, '12px 32px 0')

    def action(sym, kind, title, desc):
        b, f, bd = TAGS[kind]
        ic = tbl(f'<tr><td width="32" height="32" align="center" valign="middle" style="width:32px;height:32px;'
                 f'text-align:center;vertical-align:middle;{card(b, bd)}">'
                 f'{T(sym, 15, 18, f, 700, align="center")}</td></tr>', width='32')
        return (f'<tr><td width="32" valign="middle" style="width:32px;padding:16px 0 16px 20px;vertical-align:middle;">{ic}</td>'
                f'<td valign="middle" style="vertical-align:middle;padding:16px 20px 16px 16px;">'
                f'{T(title, 14, 20, N100, 600, mb=2)}{T(desc, 12, 18, N500)}</td></tr>')
    acts = tbl(
        action('&#10003;&#65038;', 'green', 'Пойти на новую дату', 'Подтвердить, билеты действительны')
        + f'<tr><td colspan="2" style="padding:0 20px;">{line()}</td></tr>'
        + action('&#8592;', 'orange', 'Вернуть деньги', ty('Полный возврат на карту в течение 5 дней')),
        style=card(N950, N800), bgc=N950)
    body += comment('ВЫБОР ДЕЙСТВИЯ') + row(caption('Выберите действие') + acts, '32px 32px 0', 'pad sec')

    body += comment('КНОПКИ') + row(
        button('Подтвердить новую дату')
        + '<div style="height:8px;line-height:8px;font-size:0;">&nbsp;</div>'
        + button('Оформить возврат', kind='ghost'),
        '32px 32px 56px', 'pad sec end')

    css = """
      .date-pad { padding: 14px !important; }
      .num-lg { font-size: 22px !important; line-height: 26px !important; }
      .date-sub { font-size: 11px !important; line-height: 16px !important; }"""
    return page('Дата мероприятия изменилась — Ticket to Show', tag('Важное', 'red', align='right'),
                body, footer('Правила возврата'), css)


# ════════════════════════════════════════════════════════════════════
# 3. НАПОМИНАНИЕ В ДЕНЬ СОБЫТИЯ
# ════════════════════════════════════════════════════════════════════
def reminder():
    body = hero(ty('Напоминаем — сегодня в ') + S('19:00', ACC) + ty(' у вас мероприятие!'))

    body += comment('СОБЫТИЕ') + row(
        event_h('Аида Гарифуллина и Пётр Дранга', 'Московская консерватория', 'purple'), '32px 32px 0', 'pad sec')

    def cell(label, value):
        return (f'<td width="50%" valign="top" class="time-pad" style="width:50%;padding:18px 20px;vertical-align:top;">'
                f'{caption(label, mb=6)}{T(value, 30, 34, N100, font=NUM, cls="num-lg")}</td>')
    when = tbl('<tr>' + cell('Время', '19:00')
               + f'<td width="1" style="width:1px;font-size:0;line-height:0;{bg(N800)}">&nbsp;</td>'
               + cell('Дата', '22&nbsp;апреля') + '</tr>',
               style=card(N950, N800), bgc=N950)
    body += comment('ВРЕМЯ И ДАТА') + row(when, '12px 32px 0')

    seats = ['Партер, ряд&nbsp;4, место 15', 'Партер, ряд&nbsp;4, место 16']
    rows_ = line() + ''.join(
        tbl(f'<tr><td valign="middle" style="padding:13px 0;vertical-align:middle;">{T(s, 14, 20, N200)}</td>'
            f'<td align="right" valign="middle" style="padding:13px 0;vertical-align:middle;">'
            f'{T("×1", 13, 20, N500, align="right")}</td></tr>') + line()
        for s in seats)
    body += comment('МЕСТА') + row(caption('Места', mb=10) + rows_, '32px 32px 0', 'pad sec')

    body += comment('СКАЧАТЬ БИЛЕТЫ') + row(button('Скачать PDF (билет/-ы)'), '28px 32px 0', 'pad sec')

    qr = tbl(f'<tr><td width="104" height="104" align="center" valign="middle" style="width:104px;height:104px;'
             f'text-align:center;vertical-align:middle;{card(N900, N800)}">'
             f'<!-- QR-код менеджера: в проде <img> 104×104 -->{caption("QR", mb=0, align="center")}</td></tr>',
             width='104')
    qr_card = tbl(
        f'<tr><td width="104" valign="middle" style="width:104px;padding:16px;vertical-align:middle;">{qr}</td>'
        f'<td valign="middle" style="vertical-align:middle;padding:16px 24px 16px 4px;">'
        + T(ty('Сканируйте QR для связи с менеджером или ') + link('перейдите по ссылке') + '.', 13, 21, N300)
        + '</td></tr>',
        style=card(N950, N800), bgc=N950)
    body += comment('QR МЕНЕДЖЕРА (десктоп)') + row(qr_card, '12px 32px 56px', 'pad', tr=' class="hide-mob"')
    body += (comment('СВЯЗАТЬСЯ С МЕНЕДЖЕРОМ (мобильный)')
             + row(button('Связаться с менеджером', kind='ghost'), '8px 20px 40px', 'pad',
                   tr=' class="show-mob" style="display:none;"'))

    css = """
      .time-pad { padding: 16px !important; }
      .num-lg { font-size: 24px !important; line-height: 28px !important; }"""
    return page('Напоминаем: сегодня мероприятие — Ticket to Show', eyebrow('Напоминание', tag='span'),
                body, footer('Возврат билетов'), css)


# ════════════════════════════════════════════════════════════════════
# 4. ПРОМОКОД
# ════════════════════════════════════════════════════════════════════
def promo():
    body = hero(ty('Скидка ') + S('15%', ACC) + ty(' на лучшие события'),
                ty('Специально для вас — персональный промокод со скидкой 15% на любое событие.'),
                over='Эксклюзивное предложение')

    code = tbl(f'<tr><td class="code-pad" style="padding:14px 22px 14px 29px;border:1px dashed {N700};border-radius:2px;{bg(N900)}">'
               f'{T("BACK15", 30, 36, N100, 700, ls=".24em", align="center", cls="promo-code")}</td></tr>',
               width='auto', align='center', bgc=N900)
    pc = tbl(
        f'<tr><td class="card-pad" align="center" style="padding:28px 24px;text-align:center;">'
        f'{caption("Ваш промокод", mb=14, align="center")}{code}'
        f'<div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>'
        f'{T(ty("Скидка 15% на любое событие"), 13, 20, N300, align="center", mb=12)}'
        f'{tag("до 31 марта 2026", "orange", align="center")}</td></tr>',
        style=card(N950, N800), bgc=N950)
    body += comment('ПРОМОКОД') + row(pc, '32px 32px 0', 'pad sec')

    events = [
        ('Светлана Сурганова и оркестр', 'Кремлёвский дворец', '14&nbsp;апр&nbsp;·&nbsp;19:30', '2&nbsp;940&nbsp;₽', '2&nbsp;500&nbsp;₽', 'warm'),
        ('Аида Гарифуллина и Пётр Дранга', 'Московская консерватория', '31&nbsp;мая&nbsp;·&nbsp;19:00', '8&nbsp;235&nbsp;₽', '7&nbsp;000&nbsp;₽', 'purple'),
        ('Ричард Клайдерман', 'Дом музыки', '18&nbsp;июн&nbsp;·&nbsp;19:00', '4&nbsp;115&nbsp;₽', '3&nbsp;500&nbsp;₽', 'cool'),
    ]
    cards = []
    for name, venue, when, old, new, kind in events:
        chip = tbl(f'<tr><td style="padding:5px 9px;{card(N950, N800)}">'
                   f'{T(when, 10, 14, N200, 600, ls=".14em", upper=True, tag="span", extra="display:block;white-space:nowrap;")}'
                   f'</td></tr>', width='auto')
        price = tbl(
            f'<tr><td valign="middle" style="padding-right:10px;vertical-align:middle;">'
            # зачёркивание рисуется цветом текста — здесь цвет обычный, не градиентом
            f'<span style="font-family:{NUM};font-size:16px;line-height:20px;color:{N500};text-decoration:line-through;">{old}</span></td>'
            f'<td valign="middle" style="padding-right:12px;vertical-align:middle;">{T(new, 22, 26, N100, font=NUM)}</td>'
            f'<td valign="middle" style="vertical-align:middle;">{tag("&minus;15%", "green")}</td></tr>',
            width='auto')
        cards.append(tbl(
            f'<tr><td class="cover" height="180" valign="bottom" style="height:180px;padding:14px;vertical-align:bottom;'
            f'{blob(kind)}"><!-- обложка события: в проде фон-картинка 536×180 -->{chip}</td></tr>'
            f'<tr><td class="card-pad" style="padding:18px 20px 20px;">'
            f'{T(ty(name), 20, 26, N100, font=HEAD, mb=4, cls="ev-title")}{T(venue, 12, 18, N500, mb=14)}'
            f'{line(N800)}<div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>{price}</td></tr>',
            style=card(N950, N800), bgc=N950))
    gap = '<div style="height:12px;line-height:12px;font-size:0;">&nbsp;</div>'
    body += comment('СОБЫТИЯ СО СКИДКОЙ') + row(caption('События со скидкой') + gap.join(cards), '32px 32px 0', 'pad sec')

    body += comment('КНОПКА') + row(button('Воспользоваться скидкой'), '32px 32px 56px', 'pad sec end')
    css = """
      .cover { height: 150px !important; }
      .promo-code { font-size: 24px !important; line-height: 30px !important; }"""
    return page('Скидка 15% на лучшие события — Ticket to Show', eyebrow('Только для вас', tag='span'),
                body, footer(), css)


# ════════════════════════════════════════════════════════════════════
# 5. ПЕРСОНАЛЬНАЯ ПОДБОРКА
# ════════════════════════════════════════════════════════════════════
def personal():
    body = hero('События, которые вам&nbsp;понравятся',
                ty('На основе ваших прошлых покупок. Бронируйте, пока есть места.'),
                over='Персональная подборка&nbsp;&nbsp;·&nbsp;&nbsp;Март 2026')

    thumb = tbl(f'<tr><td class="thumb-lg" width="88" height="88" style="width:88px;height:88px;font-size:0;line-height:0;'
                f'border-radius:2px;{blob("cool")}">&nbsp;</td></tr>', width='88')
    date_chip = tbl(f'<tr><td style="padding:5px 10px;{card(N900, N800)}">'
                    f'{T("ср,&nbsp;22&nbsp;апр,&nbsp;19:00", 12, 16, N200, 500, tag="span", extra="display:block;white-space:nowrap;")}'
                    f'</td></tr>', width='auto')
    meta_row = tbl(
        f'<tr><td valign="middle" style="padding-right:14px;vertical-align:middle;">{date_chip}</td>'
        f'<td valign="middle" style="vertical-align:middle;white-space:nowrap;">'
        f'{S("от&nbsp;", N500, f"font-family:{SANS};font-size:12px;line-height:24px;")}'
        f'{S("7&nbsp;000&nbsp;₽", N100, f"font-family:{NUM};font-size:22px;line-height:24px;")}</td></tr>',
        width='auto')
    featured = tbl(
        f'<tr><td class="thumb-lg-cell" width="88" valign="top" style="width:88px;padding:16px;vertical-align:top;">'
        f'<!-- обложка события: в проде <img> 88×88 -->{thumb}</td>'
        f'<td valign="top" style="vertical-align:top;padding:16px 20px 16px 0;">'
        f'{caption("Классика&nbsp;·&nbsp;6+", mb=6)}'
        f'{T("Аида Гарифуллина и&nbsp;Пётр Дранга", 20, 26, N100, font=HEAD, mb=4, cls="ev-title")}'
        f'{T("Московская консерватория", 12, 18, N500, mb=12)}{meta_row}</td></tr>',
        style=card(N950, N800), bgc=N950)
    body += comment('ХИТ ПРОДАЖ') + row(caption('&#9733;&nbsp;Хит продаж') + featured, '36px 32px 0', 'pad sec')

    recs = [
        ('Спектакль&nbsp;·&nbsp;16+', 'Два поэта. Две эпохи', 'Дом музыки', 'пн,&nbsp;30&nbsp;мар,&nbsp;19:00', '5&nbsp;000&nbsp;₽', 'warm'),
        ('Классика&nbsp;·&nbsp;6+', 'Paolo Baccianella', 'Дом музыки', 'ср,&nbsp;22&nbsp;апр,&nbsp;19:00', '2&nbsp;000&nbsp;₽', 'cool'),
        ('Классика&nbsp;·&nbsp;12+', 'Спиваков и&nbsp;Герзмава', 'Дом музыки', 'пн,&nbsp;18&nbsp;мая,&nbsp;19:00', '5&nbsp;000&nbsp;₽', 'purple'),
        ('Классика&nbsp;·&nbsp;12+', 'Ван Гог. Письма к&nbsp;брату', 'Дом музыки', 'сб,&nbsp;23&nbsp;мая,&nbsp;19:00', '2&nbsp;500&nbsp;₽', 'green'),
    ]

    def rec_card(cat, name, venue, when, price, kind):
        chip = tbl(f'<tr><td style="padding:4px 10px;{card(N950, N800)}">'
                   f'{S("от&nbsp;", N500, f"font-family:{SANS};font-size:11px;line-height:20px;")}'
                   f'{S(price, N100, f"font-family:{NUM};font-size:16px;line-height:20px;")}</td></tr>', width='auto')
        buy = tbl(f'<tr><td bgcolor="{ACC}" style="border-radius:2px;{bg(ACC)}">'
                  f'<a href="#" target="_blank" style="display:block;padding:10px 14px;font-family:{SANS};font-size:11px;'
                  f'font-weight:700;line-height:14px;letter-spacing:.16em;text-transform:uppercase;text-decoration:none;'
                  f'white-space:nowrap;">{S("Купить", WHITE)}</a></td></tr>', width='auto', align='right')
        foot_ = tbl(f'<tr><td valign="middle" style="vertical-align:middle;">'
                    f'{T(when, 12, 16, N300, extra="white-space:nowrap;")}</td>'
                    f'<td align="right" valign="middle" style="vertical-align:middle;">{buy}</td></tr>')
        return tbl(
            f'<tr><td class="cover-sm" height="120" valign="bottom" style="height:120px;padding:12px;vertical-align:bottom;'
            f'{blob(kind)}"><!-- обложка события: в проде фон-картинка -->{chip}</td></tr>'
            f'<tr><td style="padding:14px 16px 16px;">{caption(cat, mb=6)}'
            f'{T(name, 17, 22, N100, font=HEAD, mb=4)}{T(venue, 12, 18, N500, mb=14)}{foot_}</td></tr>',
            style=card(N950, N800), bgc=N950)

    grid = ''
    for i in range(0, len(recs), 2):
        l_, r_ = recs[i], recs[i + 1]
        grid += tbl(
            f'<tr><td class="col col-l" width="50%" valign="top" style="width:50%;padding:0 6px 12px 0;vertical-align:top;">'
            f'{rec_card(*l_)}</td>'
            f'<td class="col col-r" width="50%" valign="top" style="width:50%;padding:0 0 12px 6px;vertical-align:top;">'
            f'{rec_card(*r_)}</td></tr>')
    body += comment('ТАКЖЕ РЕКОМЕНДУЕМ') + row(caption('Также рекомендуем') + grid, '32px 32px 0', 'pad sec')

    banner = tbl(
        f'<tr><td class="col banner-txt" valign="middle" style="padding:22px 24px;vertical-align:middle;">'
        f'{T(ty("Ещё больше событий в Москве"), 20, 26, N100, font=HEAD, mb=4)}'
        f'{T("Обновляется каждый день", 12, 18, N500)}</td>'
        f'<td class="col banner-btn" width="150" valign="middle" style="width:150px;padding:22px 24px 22px 0;vertical-align:middle;">'
        f'{button("Открыть&nbsp;&rarr;", size="md")}</td></tr>',
        style=card(N950, N800), bgc=N950)
    body += comment('ВСЕ СОБЫТИЯ') + row(banner, '0 32px 56px', 'pad end')

    css = """
      .thumb-lg-cell { width: 64px !important; padding: 14px !important; }
      .thumb-lg { width: 64px !important; height: 64px !important; }
      .cover-sm { height: 140px !important; }
      .banner-txt { padding: 20px 20px 16px !important; }
      .banner-btn { padding: 0 20px 20px !important; }"""
    label = (f'<a href="#" target="_blank" style="font-family:{SANS};font-size:10px;font-weight:600;line-height:14px;'
             f'letter-spacing:.22em;text-transform:uppercase;text-decoration:none;{tc(N300)}">Для вас</a>')
    return page('События, которые вам понравятся — Ticket to Show', label, body,
                footer(unsub='Отписаться от&nbsp;рекомендаций'), css)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, fn in [('after-show', after_show), ('reschedule', reschedule), ('reminder', reminder),
                     ('promo', promo), ('personal', personal)]:
        path = os.path.join(OUT, f'{name}.html')
        with open(path, 'w', encoding='utf-8') as f:
            f.write(fn())
        print(f'emails/mailings/{name}.html  {os.path.getsize(path)} B')
