/**
 * Site shell content (menus, footer, contact details). Phase A: authored from the live site snapshot
 * (content/snapshot/raw/home.html). Phase B: replaced by the WordPress menus/options behind the same types.
 */
export type MenuItem = { label: string; href: string; children?: MenuItem[] };

export const mainMenu: MenuItem[] = [
  {
    label: "Who we are",
    href: "/who-we-are/",
    children: [
      { label: "Techversant", href: "/who-we-are/#company" },
      { label: "Our Philosophy", href: "/who-we-are/#philosophy" },
      { label: "Leadership Team", href: "/who-we-are/#team" },
      { label: "Our Skills", href: "/who-we-are/#skills" },
      { label: "Clients", href: "/who-we-are/#clients" },
      { label: "Technologies", href: "/who-we-are/#techStack" },
      { label: "Awards & Certifications", href: "/who-we-are/#iso" },
    ],
  },
  {
    label: "What we do",
    href: "#",
    children: [
      {
        label: "Industries",
        href: "/industries/",
        children: [
          { label: "Healthcare & Life Sciences", href: "/industries/healthcare-life-sciences/" },
          { label: "Financial Services & Fintech", href: "/industries/financial-services-fintech/" },
          { label: "Education & Learning", href: "/industries/education-learning/" },
          { label: "Retail & eCommerce", href: "/industries/retail-ecommerce/" },
          { label: "Real Estate & Property Management", href: "/industries/real-estate-property-management/" },
          { label: "HR & Workforce Management", href: "/industries/hr-workforce-management/" },
          { label: "Media & Publishing", href: "/industries/media-publishing/" },
          { label: "Travel & Tourism", href: "/industries/travel-tourism/" },
          { label: "More…", href: "/industries/" },
        ],
      },
      {
        label: "Services",
        href: "/services/",
        children: [
          { label: "Artificial Intelligence", href: "/services/artificial-intelligence/" },
          { label: "Web Application", href: "/services/web-application/" },
          { label: "Mobile Application", href: "/services/mobile-application/" },
          { label: "IT Consulting & Support", href: "/services/it-consulting-support/" },
          { label: "Data Science & Engineering", href: "/services/data-science-engineering/" },
          { label: "Cyber Security", href: "/services/cyber-security/" },
          { label: "Business Intelligence", href: "/services/business-intelligence/" },
          { label: "Quality Assurance", href: "/services/quality-assurance/" },
          { label: "More…", href: "/services/" },
        ],
      },
    ],
  },
  {
    label: "Technologies",
    href: "/technology/",
    children: [
      { label: "ColdFusion", href: "/technology/coldfusion/" },
      { label: ".NET", href: "/technology/dot-net/" },
      { label: "Java", href: "/technology/java-development-services/" },
      { label: "Python", href: "/technology/pythonpython-development-services/" },
      { label: "React JS", href: "/technology/react-js-development-services/" },
      { label: "Angular", href: "/technology/angular/" },
      { label: "GO", href: "/technology/go-development-services/" },
      { label: "PHP", href: "/technology/php/" },
      { label: "Moodle", href: "/technology/moodle-development-services/" },
      { label: "More…", href: "/technology/" },
    ],
  },
  { label: "Insights", href: "/customer-stories/" },
  { label: "Events", href: "/events/" },
  { label: "Career", href: "/career/" },
  { label: "Contact Us", href: "/contact-us/" },
];

export const footer = {
  tagline: ["Need a winning digital strategy?", "Contact us today!"],
  services: [
    { label: "Artificial Intelligence", href: "/services/artificial-intelligence/" },
    { label: "Web Application", href: "/services/web-application/" },
    { label: "Mobile Application", href: "/services/mobile-application/" },
    { label: "IT Consulting & Support", href: "/services/it-consulting-support/" },
    { label: "Data Science & Engineering", href: "/services/data-science-engineering/" },
    { label: "Cyber Security", href: "/services/cyber-security/" },
    { label: "Business Intelligence", href: "/services/business-intelligence/" },
  ],
  quickLinks: [
    { label: "Who we are", href: "/who-we-are/" },
    { label: "Customer Stories", href: "/customer-stories/" },
    { label: "Awards & Certifications", href: "/who-we-are/#iso" },
    { label: "Contact Us", href: "/contact-us/" },
    { label: "DPA", href: "/dpa/" },
    { label: "Privacy Policy", href: "/privacy-policy/" },
  ],
  contact: {
    markets: "USA | UK | Australia | Canada | UAE | India",
    email: "services@techversantinfotech.com",
    phones: "+91 484 4014666 | +91 471 4014953",
  },
  social: [
    { name: "Facebook", href: "https://www.facebook.com/Techversant", bg: "#3b5998" },
    { name: "X", href: "https://twitter.com/techversant", bg: "#000000" },
    { name: "YouTube", href: "https://www.youtube.com/channel/UCBe1KLayfPLAlQC", bg: "#cd201f" },
    { name: "LinkedIn", href: "https://www.linkedin.com/company/techversant-infotech-pvt-ltd", bg: "#0077b5" },
  ],
  copyrightYear: 2026,
};
