declare module "fullfiller" {
  export interface FullfillerOptions {
    language?: string;
  }

  export default function fullfiller(
    theme: string,
    options?: FullfillerOptions,
  ): Promise<{ title: string; body: string } | null | undefined>;
}
