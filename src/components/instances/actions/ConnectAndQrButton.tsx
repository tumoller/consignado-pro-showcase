// src/components/instances/actions/ConnectAndQrButton.tsx (VERSÃO DE DEPURAÇÃO)

import React, { useState } from 'react';
import { toast } from "sonner";
import { QrCode, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  instanceToken: string;
  onSuccess: () => void;
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export function ConnectAndQrButton({ instanceToken, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);

  // 1. ADICIONAMOS UM LOG AQUI para ver o estado em cada renderização
  console.log(`[ConnectAndQrButton] Renderizando. O modal está aberto? ${isQrModalOpen}`);

  const handlePress = async () => {
    setIsLoading(true);
    setQrCodeData(null);
    toast.info("Iniciando conexão...");
    try {
      const connectRes = await fetch('/api/wuzapi/connect-instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceToken }),
      });
      if (!connectRes.ok) throw new Error("Falha ao iniciar a conexão.");
      
      toast.success("Conectado! Aguardando QR Code...");
      await delay(2000);

      const qrRes = await fetch('/api/wuzapi/get-qrcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceToken }),
      });
      if (!qrRes.ok) throw new Error("Falha ao obter o QR Code.");

      const qrData = await qrRes.json();
      
      if (qrData.qrCodeBase64) {
        console.log("[ConnectAndQrButton] QR Code recebido com sucesso.");
        setQrCodeData(qrData.qrCodeBase64);
        
        // 2. ADICIONAMOS UM LOG CRÍTICO AQUI
        console.log("===> [ConnectAndQrButton] ATIVANDO O MODAL AGORA <===");
        setIsQrModalOpen(true);
        
        onSuccess();
      } else {
        throw new Error("QR Code não foi gerado a tempo. Tente novamente.");
      }

    } catch (err: any) {
      toast.error("Erro no processo.", { description: err.message });
      onSuccess();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button onClick={handlePress} disabled={isLoading} size="sm">
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
        Conectar / QR Code
      </Button>

      <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conecte seu WhatsApp</DialogTitle>
            <DialogDescription>
              Escaneie o código abaixo com seu celular.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center p-4 bg-white rounded-md">
            {qrCodeData ? (
              <img src={qrCodeData} alt="QR Code do WhatsApp" />
            ) : (
              <div className="flex items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Carregando QR Code...</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}