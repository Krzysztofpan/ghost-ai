import { EditorHomeClient } from "@/components/editor/editor-home-client"
import { getEditorProjectsData } from "@/lib/project-data"

export default async function EditorPage() {
  const { ownedProjects, sharedProjects } = await getEditorProjectsData()

  return (
    <EditorHomeClient
      ownedProjects={ownedProjects}
      sharedProjects={sharedProjects}
    />
  )
}
