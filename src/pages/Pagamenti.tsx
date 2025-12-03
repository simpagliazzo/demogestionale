import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, DollarSign, TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface PaymentWithDetails {
  id: string;
  amount: number;
  payment_date: string;
  payment_type: string;
  notes: string | null;
  participant: {
    full_name: string;
    trip: {
      id: string;
      title: string;
      destination: string;
      trip_type: string;
      departure_date: string;
    };
  };
}

export default function Pagamenti() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["all-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          id,
          amount,
          payment_date,
          payment_type,
          notes,
          participant:participants(
            full_name,
            trip:trips(id, title, destination, trip_type, departure_date)
          )
        `)
        .order("payment_date", { ascending: false });

      if (error) throw error;
      return data as unknown as PaymentWithDetails[];
    },
  });

  const filteredPayments = payments.filter((payment) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      payment.participant?.full_name?.toLowerCase().includes(searchLower) ||
      payment.participant?.trip?.title?.toLowerCase().includes(searchLower) ||
      payment.participant?.trip?.destination?.toLowerCase().includes(searchLower) ||
      payment.payment_type?.toLowerCase().includes(searchLower)
    );
  });

  const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);
  const accontiTotal = payments
    .filter((p) => p.payment_type === "acconto")
    .reduce((sum, p) => sum + p.amount, 0);
  const saldiTotal = payments
    .filter((p) => p.payment_type === "saldo")
    .reduce((sum, p) => sum + p.amount, 0);

  const paymentTypeLabels: Record<string, string> = {
    acconto: "Acconto",
    saldo: "Saldo",
    extra: "Extra",
  };

  const paymentTypeColors: Record<string, string> = {
    acconto: "bg-amber-500",
    saldo: "bg-green-500",
    extra: "bg-blue-500",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="font-display text-4xl font-bold">Pagamenti</h1>
        <p className="text-muted-foreground mt-1">
          Riepilogo di tutti i pagamenti ricevuti
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Ricevuto</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              €{totalReceived.toLocaleString("it-IT")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acconti</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              €{accontiTotal.toLocaleString("it-IT")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldi</CardTitle>
            <Calendar className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              €{saldiTotal.toLocaleString("it-IT")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca per partecipante, viaggio o tipo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Partecipante</TableHead>
                <TableHead>Viaggio</TableHead>
                <TableHead>Tipo Viaggio</TableHead>
                <TableHead>Tipo Pagamento</TableHead>
                <TableHead className="text-right">Importo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "Nessun pagamento trovato" : "Nessun pagamento registrato"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.payment_date), "dd MMM yyyy", { locale: it })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {payment.participant?.full_name || "N/A"}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{payment.participant?.trip?.title || "N/A"}</div>
                        <div className="text-sm text-muted-foreground">
                          {payment.participant?.trip?.destination}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {payment.participant?.trip?.trip_type === "day_trip" ? "Giornaliero" : "Con pernottamento"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${paymentTypeColors[payment.payment_type] || "bg-gray-500"} text-white`}>
                        {paymentTypeLabels[payment.payment_type] || payment.payment_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      €{payment.amount.toLocaleString("it-IT")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
