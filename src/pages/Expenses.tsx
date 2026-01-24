import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useExpenseSummary,
  expenseCategoryConfig,
  type Expense,
  type ExpenseCategory,
  type ExpenseFilters,
} from "@/hooks/useExpenses";
import { useProperties } from "@/hooks/useProperties";
import { useUnits } from "@/hooks/useUnits";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign,
  Plus,
  Search,
  Edit,
  Trash2,
  Receipt,
  TrendingDown,
  Building2,
  Calendar,
  Filter,
} from "lucide-react";

const formSchema = z.object({
  property_id: z.string().min(1, "Property is required"),
  unit_id: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  expense_date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
  vendor: z.string().optional(),
  is_recurring: z.boolean().default(false),
  recurring_frequency: z.string().optional(),
  is_tax_deductible: z.boolean().default(true),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function Expenses() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [filters, setFilters] = useState<ExpenseFilters>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  const { data: expenses, isLoading } = useExpenses(filters);
  const { data: properties } = useProperties();
  const { data: summary } = useExpenseSummary(filters.propertyId);
  const { mutate: createExpense, isPending: isCreating } = useCreateExpense();
  const { mutate: updateExpense, isPending: isUpdating } = useUpdateExpense();
  const { mutate: deleteExpense } = useDeleteExpense();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      property_id: "",
      category: "",
      amount: 0,
      expense_date: format(new Date(), "yyyy-MM-dd"),
      is_recurring: false,
      is_tax_deductible: true,
    },
  });

  const selectedPropertyId = form.watch("property_id");
  const { data: units } = useUnits(selectedPropertyId || undefined);

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth", { replace: true });
      }
    };
    checkAuth();
  }, [navigate]);

  const handleOpenDialog = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      form.reset({
        property_id: expense.property_id,
        unit_id: expense.unit_id || undefined,
        category: expense.category,
        amount: expense.amount,
        expense_date: expense.expense_date,
        description: expense.description || "",
        vendor: expense.vendor || "",
        is_recurring: expense.is_recurring,
        recurring_frequency: expense.recurring_frequency || undefined,
        is_tax_deductible: expense.is_tax_deductible,
        notes: expense.notes || "",
      });
    } else {
      setEditingExpense(null);
      form.reset({
        property_id: filters.propertyId || "",
        category: "",
        amount: 0,
        expense_date: format(new Date(), "yyyy-MM-dd"),
        is_recurring: false,
        is_tax_deductible: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = (data: FormData) => {
    if (editingExpense) {
      updateExpense(
        {
          id: editingExpense.id,
          ...data,
          category: data.category as ExpenseCategory,
          unit_id: data.unit_id || null,
        },
        {
          onSuccess: () => {
            toast({ title: "Expense updated" });
            setDialogOpen(false);
            setEditingExpense(null);
          },
          onError: () => {
            toast({ title: "Failed to update expense", variant: "destructive" });
          },
        }
      );
    } else {
      createExpense(
        {
          ...data,
          category: data.category as ExpenseCategory,
          unit_id: data.unit_id || null,
        },
        {
          onSuccess: () => {
            toast({ title: "Expense created" });
            setDialogOpen(false);
          },
          onError: () => {
            toast({ title: "Failed to create expense", variant: "destructive" });
          },
        }
      );
    }
  };

  const handleDelete = () => {
    if (expenseToDelete) {
      deleteExpense(expenseToDelete, {
        onSuccess: () => {
          toast({ title: "Expense deleted" });
          setDeleteDialogOpen(false);
          setExpenseToDelete(null);
        },
        onError: () => {
          toast({ title: "Failed to delete expense", variant: "destructive" });
        },
      });
    }
  };

  // Get top categories for summary
  const topCategories = summary
    ? Object.entries(summary.byCategory)
        .filter(([, amount]) => amount > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
    : [];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <TopBar />
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">Expenses</h1>
                <p className="text-muted-foreground">
                  Track and manage property expenses
                </p>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {editingExpense ? "Edit Expense" : "Add Expense"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    {/* Property */}
                    <div className="space-y-2">
                      <Label>Property *</Label>
                      <Controller
                        name="property_id"
                        control={form.control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select property" />
                            </SelectTrigger>
                            <SelectContent>
                              {properties?.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    {/* Unit (optional) */}
                    {units && units.length > 0 && (
                      <div className="space-y-2">
                        <Label>Unit (optional)</Label>
                        <Controller
                          name="unit_id"
                          control={form.control}
                          render={({ field }) => (
                            <Select
                              value={field.value || "__none__"}
                              onValueChange={(v) => field.onChange(v === "__none__" ? undefined : v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="All units / Property-wide" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Property-wide</SelectItem>
                                {units.map((u) => (
                                  <SelectItem key={u.id} value={u.id}>
                                    Unit {u.unit_number}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                    )}

                    {/* Category and Amount */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category *</Label>
                        <Controller
                          name="category"
                          control={form.control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(expenseCategoryConfig).map(
                                  ([key, config]) => (
                                    <SelectItem key={key} value={key}>
                                      {config.label}
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Amount *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...form.register("amount")}
                        />
                      </div>
                    </div>

                    {/* Date and Vendor */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Date *</Label>
                        <Input type="date" {...form.register("expense_date")} />
                      </div>
                      <div className="space-y-2">
                        <Label>Vendor</Label>
                        <Input placeholder="Vendor name" {...form.register("vendor")} />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Describe the expense..."
                        {...form.register("description")}
                      />
                    </div>

                    {/* Checkboxes */}
                    <div className="flex gap-6">
                      <div className="flex items-center space-x-2">
                        <Controller
                          name="is_tax_deductible"
                          control={form.control}
                          render={({ field }) => (
                            <Checkbox
                              id="tax_deductible"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          )}
                        />
                        <Label htmlFor="tax_deductible" className="text-sm">
                          Tax deductible
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Controller
                          name="is_recurring"
                          control={form.control}
                          render={({ field }) => (
                            <Checkbox
                              id="recurring"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          )}
                        />
                        <Label htmlFor="recurring" className="text-sm">
                          Recurring expense
                        </Label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isCreating || isUpdating}>
                        {editingExpense ? "Update" : "Add"} Expense
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total ({summary?.year})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-red-500" />
                    <span className="text-2xl font-bold">
                      ${summary?.total.toLocaleString() || "0"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {topCategories.map(([category, amount]) => {
                const config = expenseCategoryConfig[category as ExpenseCategory];
                return (
                  <Card key={category}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {config.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                        <span className="text-2xl font-bold">
                          ${amount.toLocaleString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              <Select
                value={filters.propertyId || "__all__"}
                onValueChange={(v) =>
                  setFilters({ ...filters, propertyId: v === "__all__" ? undefined : v })
                }
              >
                <SelectTrigger className="w-[180px]">
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Properties</SelectItem>
                  {properties?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.category || "__all__"}
                onValueChange={(v) =>
                  setFilters({
                    ...filters,
                    category: v === "__all__" ? undefined : (v as ExpenseCategory),
                  })
                }
              >
                <SelectTrigger className="w-[180px]">
                  <Receipt className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Categories</SelectItem>
                  {Object.entries(expenseCategoryConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={filters.search || ""}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value || undefined })
                  }
                  className="pl-10 w-[200px]"
                />
              </div>
            </div>

            {/* Expenses Table */}
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : expenses?.length === 0 ? (
              <Card className="p-12 text-center">
                <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium">No expenses found</h3>
                <p className="text-muted-foreground mt-1">
                  Add your first expense to start tracking
                </p>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses?.map((expense) => {
                      const config =
                        expenseCategoryConfig[expense.category as ExpenseCategory];
                      return (
                        <TableRow key={expense.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {format(new Date(expense.expense_date), "MMM d, yyyy")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {expense.property?.name}
                              </div>
                              {expense.unit && (
                                <div className="text-xs text-muted-foreground">
                                  Unit {expense.unit.unit_number}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${config?.color} text-white`}>
                              {config?.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{expense.vendor || "-"}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {expense.description || "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${expense.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDialog(expense)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setExpenseToDelete(expense.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        </main>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
