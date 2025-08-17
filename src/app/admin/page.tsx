import Link from "next/link";

export default function AdminHome() {
  const actions = [
    {
      href: "/admin/preorders/add",
      title: "Create Preorder Offer",
      desc: "Set price, quota, and schedule for a new preorder.",
    },
    {
      href: "/admin/items/add",
      title: "Add Item",
      desc: "Add a new product to your catalog.",
    },
    {
      href: "/admin/items",
      title: "List Items",
      desc: "View, filter, and edit all items.",
    },
    {
      href: "/admin/preorders",
      title: "List Preorder Offers",
      desc: "See all offers, statuses, and performance.",
    },
  ];

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-gray-600">Quick actions</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <div className="flex h-full flex-col">
              <div className="mb-3 text-base font-medium group-hover:text-sky-700">
                {a.title}
              </div>
              <div className="text-sm text-gray-600">{a.desc}</div>
              <div className="mt-4 inline-flex items-center text-sm font-medium text-sky-700">
                Go
                <svg
                  className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12.293 4.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 11-1.414-1.414L14.586 10H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
