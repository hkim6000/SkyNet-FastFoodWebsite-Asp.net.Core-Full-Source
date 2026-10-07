namespace FastFood.Models
{
    public class SiteData
    {
        public List<KeyLabel> Categories { get; set; } = new List<KeyLabel>();
        public List<KeyLabel> Diets { get; set; } = new List<KeyLabel>();
        public List<KeyLabel> Features { get; set; } = new List<KeyLabel>();
        public List<OptionSet> Options { get; set; } = new List<OptionSet>();
        public List<MenuItem> Items { get; set; } = new List<MenuItem>();
        public List<Store> Stores { get; set; } = new List<Store>();
        public List<Deal> Deals { get; set; } = new List<Deal>();
        public List<Package> Packages { get; set; } = new List<Package>();
        public List<CaterAddon> CaterAddons { get; set; } = new List<CaterAddon>();
        public List<Tier> Tiers { get; set; } = new List<Tier>();
        public List<Reward> Rewards { get; set; } = new List<Reward>();
    }

    public class KeyLabel
    {
        public string Key { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
    }

    public class Option
    {
        public string Key { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int Calories { get; set; }
    }

    public class OptionSet
    {
        public string Key { get; set; } = string.Empty;
        public List<Option> Sizes { get; set; } = new List<Option>();
        public List<Option> Addons { get; set; } = new List<Option>();
        public List<Option> Removes { get; set; } = new List<Option>();
    }

    public class MenuItem
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Options { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int Calories { get; set; }
        public List<string> Tags { get; set; } = new List<string>();
        public string Description { get; set; } = string.Empty;
        public string Image { get; set; } = string.Empty;
        public int Rank { get; set; }
    }

    public class Store
    {
        public string Key { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Hours { get; set; } = string.Empty;
        public string Weekend { get; set; } = string.Empty;
        public List<string> Features { get; set; } = new List<string>();
        public double X { get; set; }
        public double Y { get; set; }
    }

    public class Deal
    {
        public string Code { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Text { get; set; } = string.Empty;
        public string Kind { get; set; } = string.Empty;
        public decimal Value { get; set; }
        public decimal Min { get; set; }
        public string Item { get; set; } = string.Empty;
        public string Image { get; set; } = string.Empty;
        public string When { get; set; } = string.Empty;
    }

    public class Package
    {
        public string Key { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string Text { get; set; } = string.Empty;
        public string Image { get; set; } = string.Empty;
    }

    public class CaterAddon
    {
        public string Key { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string Unit { get; set; } = string.Empty;
    }

    public class Tier
    {
        public string Key { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int Points { get; set; }
        public decimal Multiplier { get; set; }
        public string Perks { get; set; } = string.Empty;
    }

    public class Reward
    {
        public int Points { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Image { get; set; } = string.Empty;
    }

    public class CartLine
    {
        public MenuItem Item { get; set; } = new MenuItem();
        public string Size { get; set; } = string.Empty;
        public List<string> Addons { get; set; } = new List<string>();
        public List<string> Removes { get; set; } = new List<string>();
        public int Qty { get; set; }
        public decimal Unit { get; set; }
        public int Calories { get; set; }
        public string Detail { get; set; } = string.Empty;
    }

    public class Totals
    {
        public string Code { get; set; } = string.Empty;
        public decimal Sub { get; set; }
        public decimal Disc { get; set; }
        public decimal Fee { get; set; }
        public decimal Tax { get; set; }
        public decimal Total { get; set; }
        public string Msg { get; set; } = string.Empty;
    }
}
