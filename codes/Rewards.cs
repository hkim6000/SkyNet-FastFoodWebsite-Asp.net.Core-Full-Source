using System.Globalization;
using System.Text;
using System.Text.Json;
using FastFood.Models;
using SkyNet;

namespace FastFood.codes
{
    public class Rewards : WebPage
    {
        public override async Task OnInitialized()
        {
            HtmlDoc.SetTitle("Rewards | Flamejack Burgers");
            HtmlDoc.AddMetaElement("viewport", "width=device-width, initial-scale=1");
            HtmlDoc.AddMetaElement("description", "Earn points on every order and trade them for free food.");

            SiteData site = await LoadSite();
            StringBuilder tiers = new StringBuilder();
            foreach (Tier t in site.Tiers)
            {
                tiers.Append("<div class=\"rw-tier rw-tier-" + t.Key + "\"><span>" + (t.Points == 0 ? "Start here" : t.Points.ToString("N0", CultureInfo.InvariantCulture) + "+ points a year") + "</span><b>" + HtmlEncode(t.Name) + "</b><em>" + t.Multiplier.ToString("0.##", CultureInfo.InvariantCulture) + "&times; points</em><p>" + HtmlEncode(t.Perks) + "</p></div>");
            }
            StringBuilder cat = new StringBuilder();
            foreach (Reward r in site.Rewards)
            {
                cat.Append("<div class=\"rw-rwd\"><img src=\"" + r.Image + "\" alt=\"\" loading=\"lazy\"><b>" + HtmlEncode(r.Name) + "</b><span>" + r.Points.ToString("N0", CultureInfo.InvariantCulture) + " pts</span></div>");
            }
            HtmlDoc.HtmlBodyText = HtmlDoc.HtmlBodyText
                .Replace("{plhd_tiers}", tiers.ToString())
                .Replace("{plhd_rewards}", cat.ToString());
        }

        public async Task<ApiResponse> Points()
        {
            ApiResponse response = new ApiResponse();
            SiteData site = await LoadSite();
            decimal spend;
            int visits;
            decimal.TryParse(GetDataValue("spend"), NumberStyles.Number, CultureInfo.InvariantCulture, out spend);
            int.TryParse(GetDataValue("visits"), out visits);
            if (spend <= 0 || spend > 2000)
            {
                response.SetElementContents("rw-calc-r", "<div class=\"rw-quote-e\">Enter a monthly spend between $1 and $2,000.</div>");
                return response;
            }
            visits = Math.Clamp(visits, 1, 60);
            int basePts = (int)Math.Floor(spend * 12) * 10;
            Tier tier = site.Tiers.OrderByDescending(t => t.Points).First(t => basePts >= t.Points);
            int pts = (int)Math.Floor(basePts * tier.Multiplier) + 12 * visits * 5;
            List<Reward> fit = site.Rewards.Where(r => r.Points <= pts).OrderByDescending(r => r.Points).Take(2).ToList();
            StringBuilder sb = new StringBuilder();
            sb.Append("<div class=\"rw-calc-big\"><b>" + pts.ToString("N0", CultureInfo.InvariantCulture) + "</b><span>points a year</span></div>");
            sb.Append("<div class=\"rw-calc-tier\">You&rsquo;d reach <b>" + HtmlEncode(tier.Name) + "</b> &mdash; " + tier.Multiplier.ToString("0.##", CultureInfo.InvariantCulture) + "&times; points, plus 5 bonus points for each of your " + visits + " visits a month.</div>");
            if (fit.Count > 0)
            {
                sb.Append("<ul>");
                foreach (Reward r in fit)
                {
                    sb.Append("<li>That&rsquo;s <b>" + pts / r.Points + " &times; " + HtmlEncode(r.Name) + "</b> (" + r.Points.ToString("N0", CultureInfo.InvariantCulture) + " pts each)</li>");
                }
                sb.Append("</ul>");
            }
            response.SetElementContents("rw-calc-r", sb.ToString());
            return response;
        }

        public async Task<ApiResponse> Join()
        {
            ApiResponse response = new ApiResponse();
            
            string name = (GetDataValue("name") ?? string.Empty).Trim();
            string email = (GetDataValue("email") ?? string.Empty).Trim();
            string month = (GetDataValue("month") ?? string.Empty).Trim();
            bool agree = GetDataValue("agree") == "1";
            string eName = name.Length < 2 || name.Length > 60 ? "Please tell us your name." : string.Empty;
            string eEmail = !IsEmail(email) ? "Please enter a valid email address." : string.Empty;
            string eAgree = !agree ? "Please accept the program terms." : string.Empty;
            response.SetElementContents("rw-e-name", eName);
            response.SetElementContents("rw-e-email", eEmail);
            response.SetElementContents("rw-e-agree", eAgree);
            if (eName + eEmail + eAgree != string.Empty)
            {
                response.SetElementContents("rw-sent", string.Empty);
                return response;
            }
            string bday = month != string.Empty && CultureInfo.InvariantCulture.DateTimeFormat.MonthNames.Take(12).Contains(month) ? " We&rsquo;ll send a free shake in " + HtmlEncode(month) + "." : string.Empty;
            response.SetElementContents("rw-sent", "<b>Welcome to Flamejack Rewards, " + HtmlEncode(name) + "!</b> 200 bonus points are waiting on your first order." + bday + " (Demo only &mdash; no account was created.)");
            response.ExecuteScript("RewardsJs.sent();");
            return response;
        }

        public async Task<ApiResponse> Search()
        {
            ApiResponse response = new ApiResponse();
            string q = Clip(GetDataValue("q"));
            SiteData site = await LoadSite();
            List<string> rows = new List<string>();
            int total = 0;
            if (q.Length >= 2)
            {
                foreach (MenuItem i in site.Items.Where(i => Has(i.Name, q) || Has(i.Description, q) || Has(LabelOf(site.Categories, i.Category), q)).OrderBy(i => i.Rank))
                {
                    total++;
                    rows.Add(Sugg("Menu", i.Image, i.Name, Money(i.Price) + " · " + i.Calories + " cal", "Item?id=" + i.Id));
                }
                foreach (Deal d in site.Deals.Where(d => Has(d.Title, q) || Has(d.Code, q) || Has(d.Text, q)))
                {
                    total++;
                    rows.Add(Sugg("Deal", d.Image, d.Title, "Code " + d.Code, "Deals"));
                }
                foreach (Store s in site.Stores.Where(s => Has(s.Name, q) || Has(s.Address, q) || Has(s.City, q)))
                {
                    total++;
                    rows.Add(Sugg("Store", string.Empty, "Flamejack " + s.Name, s.Address + " · " + s.Hours, "Locations"));
                }
            }
            StringBuilder sb = new StringBuilder();
            if (total == 0)
            {
                sb.Append("<div class=\"rw-sg-none\">No results for &ldquo;" + HtmlEncode(q) + "&rdquo;</div>");
            }
            else
            {
                foreach (string r in rows.Take(7))
                {
                    sb.Append(r);
                }
                sb.Append("<div class=\"rw-sg-foot\">" + total + (total == 1 ? " result" : " results") + " across the menu, deals and stores</div>");
            }
            response.SetElementContents("rw-sugg", sb.ToString());
            response.ExecuteScript("RewardsJs.openSugg();");
            return response;
        }

        public async Task<ApiResponse> Quick()
        {
            ApiResponse response = new ApiResponse();
            SiteData site = await LoadSite();
            MenuItem? it = site.Items.FirstOrDefault(i => i.Id == (GetDataValue("id") ?? string.Empty).Trim());
            if (it == null)
            {
                return response;
            }
            CartLine line = MakeLine(site, it, DefaultSize(OptionsOf(site, it)), new List<string>(), new List<string>(), 1);
            List<CartLine> cart = Merge(ParseCart(site, GetDataValue("cart")), line);
            Toast(response, "<b>" + HtmlEncode(it.Name) + "</b> added to your order. <a href=\"Order\">View order &rarr;</a>");
            SendCart(response, site, cart);
            return response;
        }

        public async Task<ApiResponse> Apply()
        {
            ApiResponse response = new ApiResponse();
            SiteData site = await LoadSite();
            string code = (GetDataValue("code") ?? string.Empty).Trim().ToUpperInvariant();
            Deal? d = site.Deals.FirstOrDefault(x => x.Code == code);
            if (d == null)
            {
                Toast(response, "That deal has ended.");
                return response;
            }
            response.ExecuteScript("RewardsJs.setPromo('" + d.Code + "');");
            Toast(response, "Code <b>" + d.Code + "</b> is on your order: " + HtmlEncode(d.Title.ToLowerInvariant()) + ". <a href=\"Order\">Go to order &rarr;</a>");
            return response;
        }

        public async Task<ApiResponse> Subscribe()
        {
            ApiResponse response = new ApiResponse();
            
            string email = (GetDataValue("email") ?? string.Empty).Trim();
            if (!IsEmail(email))
            {
                response.SetElementContents("rw-nl-msg", "<span class=\"rw-err\">Please enter a valid email address.</span>");
                return response;
            }
            response.SetElementContents("rw-nl-msg", "<span class=\"rw-ok\">You&rsquo;re in! Deals go to " + HtmlEncode(email) + ". (Demo only &mdash; nothing was stored.)</span>");
            response.ExecuteScript("RewardsJs.subscribed();");
            return response;
        }

        private static void Toast(ApiResponse response, string html)
        {
            response.SetElementContents("rw-toast", html);
            response.ExecuteScript("RewardsJs.toast();");
        }

        private static void SendCart(ApiResponse response, SiteData site, List<CartLine> cart)
        {
            decimal sub = cart.Sum(c => c.Unit * c.Qty);
            response.ExecuteScript("RewardsJs.setCart('" + Serialize(cart) + "', " + cart.Sum(c => c.Qty) + ", '" + Money(sub) + "');");
        }

        private static OptionSet OptionsOf(SiteData site, MenuItem it)
        {
            return site.Options.FirstOrDefault(o => o.Key == it.Options) ?? new OptionSet();
        }

        private static string DefaultSize(OptionSet o)
        {
            if (o.Sizes.Count == 0)
            {
                return string.Empty;
            }
            Option? zero = o.Sizes.FirstOrDefault(s => s.Price == 0);
            return (zero ?? o.Sizes[0]).Key;
        }

        private static CartLine MakeLine(SiteData site, MenuItem it, string size, List<string> addons, List<string> removes, int qty)
        {
            OptionSet o = OptionsOf(site, it);
            Option? sz = o.Sizes.FirstOrDefault(s => s.Key == size) ?? o.Sizes.FirstOrDefault(s => s.Key == DefaultSize(o));
            List<Option> ad = o.Addons.Where(a => addons.Contains(a.Key)).ToList();
            List<Option> rm = o.Removes.Where(r => removes.Contains(r.Key)).ToList();
            List<string> parts = new List<string>();
            if (sz != null && sz.Key != DefaultSize(o))
            {
                parts.Add(sz.Label);
            }
            else if (sz != null && o.Sizes.Count > 0 && it.Category != "burgers")
            {
                parts.Add(sz.Label);
            }
            parts.AddRange(ad.Select(a => a.Key == "combo" ? "Combo" : "+ " + a.Label));
            parts.AddRange(rm.Select(r => r.Label));
            return new CartLine
            {
                Item = it,
                Size = sz == null ? string.Empty : sz.Key,
                Addons = ad.Select(a => a.Key).ToList(),
                Removes = rm.Select(r => r.Key).ToList(),
                Qty = Math.Clamp(qty, 1, 20),
                Unit = it.Price + (sz == null ? 0 : sz.Price) + ad.Sum(a => a.Price),
                Calories = Math.Max(0, it.Calories + (sz == null ? 0 : sz.Calories) + ad.Sum(a => a.Calories)),
                Detail = string.Join(" · ", parts)
            };
        }

        private static List<CartLine> ParseCart(SiteData site, string? raw)
        {
            List<CartLine> list = new List<CartLine>();
            foreach (string part in (raw ?? string.Empty).Split('|', StringSplitOptions.RemoveEmptyEntries).Take(30))
            {
                string[] f = part.Split('~');
                if (f.Length != 5)
                {
                    continue;
                }
                MenuItem? it = site.Items.FirstOrDefault(i => i.Id == f[0]);
                int qty;
                if (it == null || !int.TryParse(f[4], out qty) || qty < 1)
                {
                    continue;
                }
                CartLine line = MakeLine(site, it, f[1], f[2].Split('.', StringSplitOptions.RemoveEmptyEntries).ToList(), f[3].Split('.', StringSplitOptions.RemoveEmptyEntries).ToList(), qty);
                list = Merge(list, line);
            }
            return list;
        }

        private static List<CartLine> Merge(List<CartLine> list, CartLine line)
        {
            CartLine? same = list.FirstOrDefault(c => Key(c) == Key(line));
            if (same != null)
            {
                same.Qty = Math.Min(20, same.Qty + line.Qty);
            }
            else if (list.Count < 30)
            {
                list.Add(line);
            }
            return list;
        }

        private static string Key(CartLine c)
        {
            return c.Item.Id + "~" + c.Size + "~" + string.Join(".", c.Addons.OrderBy(x => x)) + "~" + string.Join(".", c.Removes.OrderBy(x => x));
        }

        private static string Serialize(List<CartLine> cart)
        {
            return string.Join("|", cart.Select(c => Key(c) + "~" + c.Qty));
        }

        private static Totals Compute(SiteData site, List<CartLine> cart, string code, string mode)
        {
            Totals t = new Totals();
            t.Sub = cart.Sum(c => c.Unit * c.Qty);
            Deal? d = site.Deals.FirstOrDefault(x => x.Code == code);
            bool freeDelivery = t.Sub >= 35m;
            if (d != null)
            {
                t.Code = d.Code;
                if (d.Kind == "percent" || d.Kind == "amount")
                {
                    if (t.Sub >= d.Min)
                    {
                        t.Disc = d.Kind == "percent" ? Math.Round(t.Sub * d.Value / 100m, 2) : Math.Min(d.Value, t.Sub);
                        t.Msg = d.Title + " applied.";
                    }
                    else
                    {
                        t.Msg = "Add " + Money(d.Min - t.Sub) + " more to use " + d.Code + ".";
                    }
                }
                else if (d.Kind == "free")
                {
                    bool burger = cart.Any(c => c.Item.Category == "burgers");
                    CartLine? fries = cart.Where(c => c.Item.Id == d.Item).OrderBy(c => c.Unit).FirstOrDefault();
                    if (burger && fries != null)
                    {
                        t.Disc = Math.Min(fries.Unit, site.Items.First(i => i.Id == d.Item).Price);
                        t.Msg = "Free Golden Fries applied.";
                    }
                    else
                    {
                        t.Msg = "Add a burger and Golden Fries to use " + d.Code + ".";
                    }
                }
                else if (d.Kind == "delivery")
                {
                    if (mode == "delivery")
                    {
                        freeDelivery = true;
                        t.Msg = "Free delivery applied.";
                    }
                    else
                    {
                        t.Msg = d.Code + " works on delivery orders.";
                    }
                }
                else if (d.Kind == "shake")
                {
                    List<decimal> units = new List<decimal>();
                    foreach (CartLine c in cart.Where(c => c.Item.Options == "shake"))
                    {
                        for (int i = 0; i < c.Qty; i++)
                        {
                            units.Add(c.Unit);
                        }
                    }
                    if (units.Count >= 2)
                    {
                        t.Disc = Math.Round(units.Min() * d.Value / 100m, 2);
                        t.Msg = "Second shake half price applied.";
                    }
                    else
                    {
                        t.Msg = "Add two shakes to use " + d.Code + ".";
                    }
                }
            }
            t.Fee = mode == "delivery" && !freeDelivery ? 3.99m : 0m;
            t.Tax = Math.Round((t.Sub - t.Disc) * 0.075m, 2);
            t.Total = t.Sub - t.Disc + t.Fee + t.Tax;
            return t;
        }

        private static string Sugg(string type, string img, string title, string sub, string href)
        {
            string pic = img == string.Empty ? "<span class=\"rw-sg-i\">&#9679;</span>" : "<img src=\"" + img + "\" alt=\"\">";
            return "<a class=\"rw-sg\" href=\"" + href + "\">" + pic + "<span><b>" + HtmlEncode(title) + "</b><small>" + type + " &middot; " + HtmlEncode(sub) + "</small></span></a>";
        }

        private async Task<SiteData> LoadSite()
        {
            string file = Path.Combine(DataPath ?? string.Empty, "site.json");
            if (!File.Exists(file))
            {
                file = Path.Combine(Directory.GetCurrentDirectory(), "data", "site.json");
            }
            if (!File.Exists(file))
            {
                return new SiteData();
            }
            string json = await File.ReadAllTextAsync(file);
            JsonSerializerOptions options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return JsonSerializer.Deserialize<SiteData>(json, options) ?? new SiteData();
        }

        private static string Clip(string? value)
        {
            string q = (value ?? string.Empty).Trim();
            return q.Length > 40 ? q.Substring(0, 40) : q;
        }

        private static string Pick(string? value, IEnumerable<string> allowed)
        {
            string v = (value ?? string.Empty).Trim().ToLowerInvariant();
            return allowed.Contains(v) ? v : string.Empty;
        }

        private static bool Has(string text, string q)
        {
            return (text ?? string.Empty).Contains(q, StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsEmail(string v)
        {
            if (v.Length < 5 || v.Length > 80 || v.Contains(' '))
            {
                return false;
            }
            int at = v.IndexOf('@');
            int dot = v.LastIndexOf('.');
            return at > 0 && at == v.LastIndexOf('@') && dot > at + 1 && dot < v.Length - 1;
        }

        private static string Money(decimal v)
        {
            return "$" + v.ToString("0.00", CultureInfo.InvariantCulture);
        }

        private static string CountText(int n, string one, string many)
        {
            return n + " " + (n == 1 ? one : many);
        }

        private static string LabelOf(List<KeyLabel> list, string key)
        {
            return list.Where(x => x.Key == key).Select(x => x.Label).FirstOrDefault() ?? key;
        }

        private static string Chips(List<KeyLabel> items, string active)
        {
            StringBuilder sb = new StringBuilder();
            sb.Append("<button type=\"button\" class=\"rw-chip" + (active == string.Empty ? " rw-act" : string.Empty) + "\" onclick=\"RewardsJs.chip(this, '')\">All</button>");
            foreach (KeyLabel k in items)
            {
                sb.Append("<button type=\"button\" class=\"rw-chip" + (k.Key == active ? " rw-act" : string.Empty) + "\" onclick=\"RewardsJs.chip(this, '" + k.Key + "')\">" + HtmlEncode(k.Label) + "</button>");
            }
            return sb.ToString();
        }

        private static string Badges(MenuItem i)
        {
            StringBuilder sb = new StringBuilder("<span class=\"rw-badges\">");
            if (i.Tags.Contains("popular"))
            {
                sb.Append("<span class=\"rw-bdg rw-bdg-p\">Popular</span>");
            }
            if (i.Tags.Contains("spicy"))
            {
                sb.Append("<span class=\"rw-bdg rw-bdg-s\">Spicy</span>");
            }
            if (i.Tags.Contains("veg"))
            {
                sb.Append("<span class=\"rw-bdg rw-bdg-v\">Veg</span>");
            }
            return sb.Append("</span>").ToString();
        }

        private static string ItemCards(SiteData site, List<MenuItem> list)
        {
            StringBuilder sb = new StringBuilder();
            foreach (MenuItem i in list)
            {
                sb.Append("<article class=\"rw-item\"><a class=\"rw-item-img\" href=\"Item?id=" + i.Id + "\"><img src=\"" + i.Image + "\" alt=\"" + HtmlEncode(i.Name) + "\" loading=\"lazy\">" + Badges(i) + "</a>");
                sb.Append("<div class=\"rw-item-b\"><h3><a href=\"Item?id=" + i.Id + "\">" + HtmlEncode(i.Name) + "</a></h3><p>" + HtmlEncode(i.Description) + "</p>");
                sb.Append("<div class=\"rw-item-f\"><span><b>" + Money(i.Price) + "</b><small>" + i.Calories + " cal</small></span><a class=\"rw-item-c\" href=\"Item?id=" + i.Id + "\">Customize</a><button type=\"button\" class=\"rw-add\" aria-label=\"Add " + HtmlEncode(i.Name) + "\" onclick=\"RewardsJs.quick('" + i.Id + "')\">+ Add</button></div></div></article>");
            }
            return sb.ToString();
        }

        private static string ItemGrid(SiteData site, List<MenuItem> list)
        {
            return ItemCards(site, list);
        }

        private static string StoreCard(SiteData site, Store s)
        {
            return "<a class=\"rw-scard\" href=\"Locations\"><b>" + HtmlEncode(s.Name) + "</b><span>" + HtmlEncode(s.Address) + "</span><small>" + HtmlEncode(s.Hours) + "</small><em>" + string.Join(" &middot; ", s.Features.Take(3).Select(f => HtmlEncode(LabelOf(site.Features, f)))) + "</em></a>";
        }
    }
}
