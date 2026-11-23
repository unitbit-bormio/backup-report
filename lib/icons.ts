import { Box, Cloud, Database, Folder, HardDrive, Monitor, Server, Usb } from "lucide-react";
import { DestType, WorkloadType } from "@/lib/model";

export type Icon = typeof Server;

export const WORKLOAD_ICON: Record<WorkloadType, Icon> = { vm: Box, server: Server, pc: Monitor, nas: Folder };
export const DEST_ICON: Record<DestType, Icon> = { das: Usb, nas: HardDrive, object: Database, vault: Cloud };
