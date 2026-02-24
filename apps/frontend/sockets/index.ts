import { useAuth } from "@clerk/clerk-expo";
import { io } from "socket.io-client";

const socket = io("https://oriented-hugely-glider.ngrok-free.app/");

export default socket;
