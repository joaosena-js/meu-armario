import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { requireUser } from "@/lib/queries/auth";
import { getUserSettings } from "@/lib/queries/settings";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const [user, settings] = await Promise.all([requireUser(), getUserSettings()]);
  return (
    <>
      <PageHeader title="Configurações" className="mx-auto max-w-2xl" />
      <SettingsForm
        email={user.email}
        defaults={{
          fullName: user.fullName ?? "",
          automaticallyAddOutOfStock: settings.automatically_add_out_of_stock,
          automaticallyAddLowStock: settings.automatically_add_low_stock,
          theme: settings.theme,
        }}
      />
    </>
  );
}
