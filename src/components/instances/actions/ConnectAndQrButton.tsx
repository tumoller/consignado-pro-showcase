// src/components/instances/actions/ConnectAndQrButton.tsx (VERSÃO SIMPLES E CORRETA)

import React, { useState, useEffect } from 'react';
import { toast } from "sonner";
import { QrCode, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  instanceToken: string;
  onSuccess: () => void; // A única função que precisamos do pai é para atualizar a lista
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export function ConnectAndQrButton({ instanceToken, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);

  // Efeito para o timer regressivo, SÓ roda quando o modal está aberto
  useEffect(() => {
    if (!isQrModalOpen) return;

    setCountdown(30);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsQrModalOpen(false); // Apenas fecha o modal
          onSuccess(); // Chama a atualização UMA VEZ
          toast.info("Tempo esgotado. Verificando status...");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isQrModalOpen, onSuccess]);


  const handlePress = async () => {
    setIsLoading(true);
    setQrCodeData(null);
    toast.info("Iniciando conexão...");
    try {
      // PASSO 1: Conectar (com o método POST correto)
      const connectRes = await fetch('/api/wuzapi/connect-instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceToken }),
      });
      if (!connectRes.ok) throw new Error("Falha ao iniciar a conexão.");
      
      toast.success("Conectado! Buscando QR Code...");
      await delay(1500); // Um delay menor

      // PASSO 2: Buscar QR Code (com o método POST correto)
      const qrRes = await fetch('/api/wuzapi/get-qrcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceToken }),
      });
      if (!qrRes.ok) throw new Error("Falha ao obter o QR Code.");

      const qrData = await qrRes.json();
      
      if (qrData.qrCodeBase64) {
        setQrCodeData(qrData.qrCodeBase64);
        setIsQrModalOpen(true); // Abre o modal
      } else {
        throw new Error("QR Code não foi gerado a tempo. Tente novamente.");
      }

    } catch (err: any) {
      toast.error("Erro no processo.", { description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para o botão "Já conectei"
  const handleManualCheck = () => {
    setIsQrModalOpen(false); // Fecha o modal
    onSuccess(); // Chama a atualização UMA VEZ
    toast.info("Verificando status da conexão...");
  };

  return (
    <>
      <Button onClick={handlePress} disabled={isLoading} size="sm">
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
        Conectar / QR Code
      </Button>

      {/* O Dialog não precisa mais do onOpenChange, ele é controlado diretamente */}
      <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
        <DialogContent onEscapeKeyDown={() => onSuccess()} onPointerDownOutside={() => onSuccess()}>
          <DialogHeader>
            <DialogTitle>Conecte seu WhatsApp</DialogTitle>
            <DialogDescription>
              Escaneie o código. A janela fechará em <span className="font-bold text-primary">{countdown}</span>s.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center p-4 bg-white rounded-md">
            {qrCodeData ? <img src={qrCodeData} alt="QR Code" /> : <Loader2 className="h-6 w-6 animate-spin" />}
          </div>
          <DialogFooter>
            <Button onClick={handleManualCheck}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Já conectei
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}