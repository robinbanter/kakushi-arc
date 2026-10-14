"use client";

import { KakushiPay } from "@kakushi/widget";
import { checkoutConfig } from "./arc";
export const Checkout = ({ to }: { to: string }) => <KakushiPay to={to} amount="0.01" {...checkoutConfig} />;
