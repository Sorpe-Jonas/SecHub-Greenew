"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";

import { SubmitButton } from "@/components/auth/submit-button";
import {
  addDownloadResourceAction,
  removeDownloadResourceAction,
  type DownloadFormState,
} from "@/app/actions/download-actions";

type DownloadResourceViewItem = {
  id: string;
  fileName: string;
  storagePath: string;
  description: string | null;
  uploadedByName: string | null;
  createdAt: string;
};

type DownloadsViewProps = {
  resources: DownloadResourceViewItem[];
  canManage: boolean;
};

const initialState: DownloadFormState = {};

export function DownloadsView({ resources, canManage }: DownloadsViewProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [createState, createAction] = useActionState(addDownloadResourceAction, initialState);
  const [deleteState, deleteAction] = useActionState(removeDownloadResourceAction, initialState);

  useEffect(() => {
    if (createState.success || deleteState.success) {
      router.refresh();
    }
  }, [createState.success, deleteState.success, router]);

  const filteredResources = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return resources;
    }

    return resources.filter((resource) => {
      const normalized = `${resource.fileName} ${resource.description ?? ""} ${resource.uploadedByName ?? ""} ${resource.storagePath}`.toLowerCase();
      return normalized.includes(query);
    });
  }, [resources, searchQuery]);

  return (
    <div className="pageContent">
      <section className="portalSection">
        <div className="sectionHeader">
          <h2>Downloads</h2>
          <p>Adicione arquivos ou links para que a equipe possa visualizar e baixar.</p>
        </div>

        {canManage ? (
          <div className="card">
            <h3>Adicionar novo recurso</h3>
            <form className="ticketForm" action={createAction}>
              <label>
                Nome do recurso
                <input name="fileName" type="text" placeholder="nome-do-arquivo.pdf" />
              </label>
              <label>
                Descricao
                <textarea
                  className="textareaInput"
                  name="description"
                  rows={3}
                  placeholder="Uma breve descricao do arquivo ou link."
                />
              </label>
              <label>
                Arquivo
                <input name="file" type="file" />
              </label>
              <label>
                Link ou caminho de download
                <input
                  name="storagePath"
                  type="text"
                  placeholder="https://... ou /uploads/downloads/arquivo.pdf"
                />
              </label>
              <p className="helperText">
                Se voce subir um arquivo, nao precisa preencher o link. Caso queira apenas um link,
                deixe o arquivo em branco.
              </p>
              {createState.error ? <p className="errorText">{createState.error}</p> : null}
              {createState.success ? <p className="successText">{createState.success}</p> : null}
              <SubmitButton idleLabel="Adicionar recurso" pendingLabel="Adicionando..." />
            </form>
          </div>
        ) : null}

        <div className="card">
          <label>
            Buscar por nome, descricao ou uploader
            <input
              className="textInput"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Pesquisar downloads..."
            />
          </label>
        </div>

        <div className="cardGrid">
          {filteredResources.length === 0 ? (
            <div className="emptyCard">
              <span className="cardLabel">Sem resultados</span>
              <h2>Nenhum arquivo encontrado</h2>
              <p>Use a busca para filtrar arquivos e links de download.</p>
            </div>
          ) : null}

          {filteredResources.map((resource) => (
            <div key={resource.id} className="portalCard slate">
              <span className="cardLabel">Download</span>
              <h2>{resource.fileName}</h2>
              <p>{resource.description || resource.storagePath}</p>
              <p className="metadataText">
                Enviado por {resource.uploadedByName || "-"} em {new Date(resource.createdAt).toLocaleDateString()}
              </p>
              <div className="cardActions">
                <a
                  className="secondaryButton"
                  href={resource.storagePath}
                  target="_blank"
                  rel="noreferrer"
                >
                  Visualizar / Baixar
                </a>
                {canManage ? (
                  <form action={deleteAction}>
                    <input type="hidden" name="resourceId" value={resource.id} />
                    <button className="destructiveButton" type="submit">
                      Remover
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        {deleteState.error ? <p className="errorText">{deleteState.error}</p> : null}
        {deleteState.success ? <p className="successText">{deleteState.success}</p> : null}
      </section>
    </div>
  );
}
