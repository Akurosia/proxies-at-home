import fullLogo from "@/assets/fullLogo.png";
import { API_BASE } from "@/constants";
import {
  cardKey,
  parseDeckToInfos,
  type CardInfo,
} from "@/helpers/CardInfoHelper";
import {
  addBleedEdge,
  getLocalBleedImageUrl,
  trimBleedEdge
} from "@/helpers/ImageHelper";
import {
  getMpcImageUrl,
  inferCardNameFromFilename,
  parseMpcText,
  tryParseMpcSchemaXml,
} from "@/helpers/Mpc";
import { useCardsStore, useLoadingStore, useSettingsStore } from "@/store";
import type { CardOption } from "@/types/Card";
import axios from "axios";
import {
  Button,
  HelperText,
  HR,
  List,
  ListItem,
  Select,
  Textarea,
} from "flowbite-react";
import { ExternalLink } from "lucide-react";
import React, { useState } from "react";

async function readText(file: File): Promise<string> {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result || ""));
    r.readAsText(file);
  });
}

export function UploadSection() {
  const [deckText, setDeckText] = useState("");
  const bleedEdgeWidth = useSettingsStore((state) => state.bleedEdgeWidth);
  const cards = useCardsStore((state) => state.cards);

  const setLoadingTask = useLoadingStore((state) => state.setLoadingTask);
  const appendCards = useCardsStore((state) => state.appendCards);
  const setCards = useCardsStore((state) => state.setCards);
  const setSelectedImages = useCardsStore((state) => state.setSelectedImages);
  const appendSelectedImages = useCardsStore(
    (state) => state.appendSelectedImages
  );
  const setOriginalSelectedImages = useCardsStore(
    (state) => state.setOriginalSelectedImages
  );
  const appendOriginalSelectedImages = useCardsStore(
    (state) => state.appendOriginalSelectedImages
  );

  const globalLanguage = useCardsStore((s) => s.globalLanguage ?? "en");
  const setGlobalLanguage = useCardsStore((s) => s.setGlobalLanguage ?? (() => { }));

  async function processToWithBleed(
    srcBase64: string,
    opts: { hasBakedBleed: boolean }
  ) {
    // If the image already includes extra border/bleed (MPC Fill), trim first.
    const trimmed = opts.hasBakedBleed
      ? await trimBleedEdge(srcBase64)
      : srcBase64;

    // Then add your consistent bleed
    const withBleedBase64 = await addBleedEdge(trimmed, bleedEdgeWidth, {
      unit: "mm",
      bleedEdgeWidth,
    });

    return { originalBase64: srcBase64, withBleedBase64 };
  }

  async function addUploadedFiles(
    files: FileList,
    opts: { hasBakedBleed: boolean }
  ) {
    const fileArray = Array.from(files);
    const startIndex = cards.length;

    const newCards: CardOption[] = fileArray.map((file, i) => ({
      name:
        inferCardNameFromFilename(file.name) ||
        `Custom Art ${startIndex + i + 1}`,
      imageUrls: [],
      uuid: crypto.randomUUID(),
      isUserUpload: true,
      hasBakedBleed: opts.hasBakedBleed,
    }));

    appendCards(newCards);

    const originalsUpdate: Record<string, string> = {};
    const processedUpdate: Record<string, string> = {};

    await Promise.all(
      fileArray.map(async (file, i) => {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        const { originalBase64, withBleedBase64 } = await processToWithBleed(
          base64,
          opts
        );

        const id = newCards[i].uuid;
        originalsUpdate[id] = originalBase64;
        processedUpdate[id] = withBleedBase64;
      })
    );

    appendOriginalSelectedImages(originalsUpdate);
    appendSelectedImages(processedUpdate);
  }

  const handleUploadMpcFill = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setLoadingTask("Uploading Images");

    try {
      const files = e.target.files;
      if (files && files.length) {
        await addUploadedFiles(files, { hasBakedBleed: true });
      }
    } finally {
      if (e.target) e.target.value = "";

      setLoadingTask(null);
    }
  };

  const handleUploadStandard = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setLoadingTask("Uploading Images");
    try {
      const files = e.target.files;
      if (!files || !files.length) return;

      const fileArray = Array.from(files);
      const startIndex = cards.length;

      const newCards: CardOption[] = fileArray.map((_, i) => ({
        name: `Custom Art ${startIndex + i + 1}`,
        imageUrls: [],
        uuid: crypto.randomUUID(),
        isUserUpload: true,
        hasBakedBleed: false,
      }));

      appendCards(newCards);

      const originalsUpdate: Record<string, string> = {};
      const processedUpdate: Record<string, string> = {};

      await Promise.all(
        fileArray.map(async (file, i) => {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });

          const { originalBase64, withBleedBase64 } = await processToWithBleed(
            base64,
            { hasBakedBleed: false }
          );

          const id = newCards[i].uuid;
          originalsUpdate[id] = originalBase64;
          processedUpdate[id] = withBleedBase64;
        })
      );

      appendOriginalSelectedImages(originalsUpdate);
      appendSelectedImages(processedUpdate);
    } finally {
      if (e.target) e.target.value = "";
      setLoadingTask(null);
    }
  };

  const handleImportMpcXml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      const raw = await readText(file);
      const schemaItems = tryParseMpcSchemaXml(raw);
      const items =
        schemaItems && schemaItems.length ? schemaItems : parseMpcText(raw);

      const newCards: CardOption[] = [];
      const newOriginals: Record<string, string> = {};

      for (const it of items) {
        for (let i = 0; i < (it.qty || 1); i++) {
          const uuid = crypto.randomUUID();
          const name =
            it.name ||
            (it.filename
              ? inferCardNameFromFilename(it.filename)
              : "Custom Art");

          newCards.push({
            uuid,
            name,
            imageUrls: [],
            isUserUpload: true,
            hasBakedBleed: true,
          });

          const mpcUrl = getMpcImageUrl(it.frontId);
          if (mpcUrl) {
            newOriginals[uuid] = mpcUrl;
          }
        }
      }

      appendCards(newCards);
      if (Object.keys(newOriginals).length) {
        appendOriginalSelectedImages(newOriginals);
      }
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  const handleSubmit = async () => {
    setLoadingTask("Fetching cards");

    try {
      const infos = parseDeckToInfos(deckText || "");
      if (!infos.length) {
        setLoadingTask(null);
        return;
      }

      const uniqueMap = new Map<string, CardInfo>();
      for (const ci of infos) uniqueMap.set(cardKey(ci), ci);
      const uniqueInfos = Array.from(uniqueMap.values());
      const uniqueNames = Array.from(new Set(uniqueInfos.map((ci) => ci.name)));

      try {
        await axios.delete(`${API_BASE}/api/cards/images`, { timeout: 15000 });
      } catch (e) {
        console.warn("[FetchCards] DELETE failed (continuing):", e);
      }

      let response: { data: CardOption[] } | null = null;
      try {
        response = await axios.post<CardOption[]>(
          `${API_BASE}/api/cards/images`,
          {
            cardQueries: uniqueInfos,
            cardNames: uniqueNames,
            cardArt: "art",
            language: globalLanguage,
          },
          { timeout: 20000 }
        );
      } catch (e: any) {
        console.error("[FetchCards] POST failed:", e);
        throw new Error(
          e?.response?.data?.error ||
          e?.message ||
          "Failed to fetch cards. Check network/CORS."
        );
      }

      const data = Array.isArray(response?.data) ? response!.data : [];
      if (!data.length) {
        throw new Error("No images found for the provided list.");
      }

      const optionByKey: Record<string, CardOption> = {};
      for (const opt of data) {
        if (!opt?.name) continue;
        const k = `${opt.name.toLowerCase()}|${opt.set ?? ""}|${opt.number ?? ""}`;
        optionByKey[k] = opt;
        const nameOnlyKey = `${opt.name.toLowerCase()}||`;
        if (!optionByKey[nameOnlyKey]) optionByKey[nameOnlyKey] = opt;
      }

      const expandedCards: CardOption[] = infos.map((ci) => {
        const k = cardKey(ci);
        const fallbackK = `${ci.name.toLowerCase()}||`;
        const card = optionByKey[k] ?? optionByKey[fallbackK];
        return {
          ...(card ?? { name: ci.name, imageUrls: [] }),
          uuid: crypto.randomUUID(),
        } as CardOption;
      });

      appendCards(expandedCards);

      const newOriginals: Record<string, string> = {};
      for (const card of expandedCards) {
        if (card?.imageUrls?.length > 0) {
          newOriginals[card.uuid] = card.imageUrls[0];
        }
      }
      appendOriginalSelectedImages(newOriginals);

      setLoadingTask(null);

      const processed: Record<string, string> = {};
      for (const [uuid, url] of Object.entries(newOriginals)) {
        try {
          const proxiedUrl = getLocalBleedImageUrl(url);
          const bleedImage = await addBleedEdge(proxiedUrl, bleedEdgeWidth, {
            unit: "mm",
            bleedEdgeWidth,
          });
          processed[uuid] = bleedImage;
        } catch (e) {
          console.warn(`[Bleed] Failed for ${uuid}:`, e);
        }
      }
      if (Object.keys(processed).length) appendSelectedImages(processed);

      setDeckText("");
    } catch (err: any) {
      console.error("[FetchCards] Error:", err);
      alert(err?.message || "Something went wrong while fetching cards.");
    } finally {
      setLoadingTask(null);
    }
  };

  const handleClear = async () => {
    setLoadingTask("Clearing Images");

    try {
      setCards([]);
      setSelectedImages({});
      setOriginalSelectedImages({});

      try {
        await axios.delete(`${API_BASE}/api/cards/images`, { timeout: 15000 });
      } catch (e) {
        console.warn("[Clear] Server cache clear failed (UI already cleared):", e);
      }
    } catch (err: any) {
      console.error("[Clear] Error:", err);
      alert(err?.message || "Failed to clear images.");
    } finally {
      setLoadingTask(null);
    }
  };


  return (
    <div className="w-1/5 dark:bg-gray-700 bg-gray-100 flex flex-col">
      <img src={fullLogo} alt="Proxxied Logo" />

      <div className="flex-1 flex flex-col overflow-y-auto gap-6 px-4 pb-4">
        <div className="flex flex-col gap-4">
          <div className="space-y-1">
            <h6 className="font-medium dark:text-white">Upload Other Images</h6>
            <label
              htmlFor="upload-standard"
              className="inline-block w-full text-center cursor-pointer rounded-md bg-gray-300 dark:bg-gray-600 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Choose Files
            </label>
            <input
              id="upload-standard"
              type="file"
              accept="image/*"
              multiple
              onChange={handleUploadStandard}
              onClick={(e) => ((e.target as HTMLInputElement).value = "")}
              className="hidden"
            />
          </div>
        </div>

        <HR className="my-0 dark:bg-gray-500" />

        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <Button color="red" onClick={handleClear}>
              Clear Cards
            </Button>
          </div>
        </div>

        <HR className="my-0 dark:bg-gray-500" />
      </div>
    </div>
  );
}
