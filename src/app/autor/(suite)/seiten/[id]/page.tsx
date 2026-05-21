import { notFound } from "next/navigation";
import { getPageById } from "@/lib/pagesApi";
import PageEditorClient from "./PageEditorClient";

type Props = { params: Promise<{ id: string }> };

export default async function EditPagePage({ params }: Props) {
  const { id } = await params;
  const page = await getPageById(id);
  if (!page) notFound();
  return <PageEditorClient page={page} />;
}
