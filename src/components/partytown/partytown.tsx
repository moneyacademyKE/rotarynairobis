import { partytownSnippet } from "@qwik.dev/partytown/integration";
import { component$ } from "@builder.io/qwik";

/**
 * Partytown Qwik Component
 *
 * This component should be placed in the <head> of your document.
 * It will safely offload third-party scripts to a web worker.
 */
export const Partytown = component$(() => {
  return <script dangerouslySetInnerHTML={partytownSnippet()} />;
});
