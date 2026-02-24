import { useAuth } from "@clerk/clerk-expo";
import { io } from "socket.io-client";

const socket = io(`${process.env.EXPO_PUBLIC_SERVER_URL || "https://oriented-hugely-glider.ngrok-free.app/"}/trpc`);

export default socket;
